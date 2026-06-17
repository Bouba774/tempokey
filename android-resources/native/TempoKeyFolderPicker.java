package app.lovable.tempokey;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;

/**
 * Sélection de DOSSIER natif via le Storage Access Framework (SAF).
 *
 * - pickFolder()           : ACTION_OPEN_DOCUMENT_TREE + takePersistableUriPermission
 * - listAudio(treeUri)     : scan récursif (sous-dossiers inclus) des fichiers audio
 * - readFile(uri,off,len)  : lecture (totale ou partielle) d'un fichier content://
 * - savedFolders()         : URIs persistantes accordées par l'utilisateur
 * - forgetFolder(treeUri)  : retire la permission persistante
 *
 * Émet l'événement "scanProgress" { scanned, found } pendant le scan.
 */
@CapacitorPlugin(name = "TempoKeyFolderPicker")
public class TempoKeyFolderPicker extends Plugin {

    private static final String PREFS = "tempokey_folders";
    private static final String KEY_FOLDERS = "uris";
    private static final String[] AUDIO_EXTS = {
        "mp3", "wav", "flac", "aiff", "aif", "m4a", "aac", "ogg", "opus"
    };

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, i, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("CANCELLED");
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("NO_URI"); return; }
        try {
            getContext().getContentResolver().takePersistableUriPermission(
                uri, Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception ignored) {}
        rememberFolder(uri.toString());
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), uri);
        JSObject ret = new JSObject();
        ret.put("treeUri", uri.toString());
        ret.put("name", root != null && root.getName() != null ? root.getName() : "Dossier");
        call.resolve(ret);
    }

    @PluginMethod
    public void listAudio(PluginCall call) {
        String treeUriStr = call.getString("treeUri");
        if (treeUriStr == null) { call.reject("MISSING_URI"); return; }
        Uri treeUri = Uri.parse(treeUriStr);
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
        if (root == null || !root.canRead()) {
            call.reject("ROOT_UNAVAILABLE");
            return;
        }
        Set<String> exts = new HashSet<>();
        for (String e : AUDIO_EXTS) exts.add(e);

        JSArray list = new JSArray();
        int scanned = 0, found = 0, ignored = 0;
        Deque<Object[]> stack = new ArrayDeque<>();
        String rootName = root.getName() != null ? root.getName() : "";
        stack.push(new Object[]{ root, rootName });

        while (!stack.isEmpty()) {
            Object[] cur = stack.pop();
            DocumentFile dir = (DocumentFile) cur[0];
            String prefix = (String) cur[1];
            DocumentFile[] children;
            try {
                children = dir.listFiles();
            } catch (Exception e) {
                continue;
            }
            for (DocumentFile c : children) {
                scanned++;
                if (c.isDirectory()) {
                    String name = c.getName() != null ? c.getName() : "";
                    if (name.startsWith(".")) { ignored++; continue; }
                    stack.push(new Object[]{ c, prefix + "/" + name });
                    continue;
                }
                String name = c.getName();
                if (name == null || name.startsWith(".")) { ignored++; continue; }
                int dot = name.lastIndexOf('.');
                if (dot < 0) { ignored++; continue; }
                String ext = name.substring(dot + 1).toLowerCase();
                if (!exts.contains(ext)) { ignored++; continue; }
                JSObject entry = new JSObject();
                entry.put("uri", c.getUri().toString());
                entry.put("name", name);
                entry.put("relativePath", (prefix.isEmpty() ? "" : prefix + "/") + name);
                entry.put("size", c.length());
                entry.put("mime", c.getType() != null ? c.getType() : "audio/" + ext);
                list.put(entry);
                found++;
                if (found % 250 == 0) {
                    JSObject ev = new JSObject();
                    ev.put("scanned", scanned);
                    ev.put("found", found);
                    notifyListeners("scanProgress", ev);
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("entries", list);
        ret.put("scanned", scanned);
        ret.put("found", found);
        ret.put("ignored", ignored);
        call.resolve(ret);
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("MISSING_URI"); return; }
        Long offsetL = call.getLong("offset");
        Long lengthL = call.getLong("length");
        long offset = offsetL != null ? offsetL : 0L;
        long length = lengthL != null ? lengthL : -1L;
        try (InputStream is = getContext().getContentResolver().openInputStream(Uri.parse(uriStr))) {
            if (is == null) { call.reject("OPEN_FAILED"); return; }
            long skipped = 0;
            while (skipped < offset) {
                long n = is.skip(offset - skipped);
                if (n <= 0) break;
                skipped += n;
            }
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[64 * 1024];
            long remaining = length;
            int n;
            while (true) {
                int toRead = length < 0
                    ? chunk.length
                    : (int) Math.min(chunk.length, remaining);
                if (toRead <= 0) break;
                n = is.read(chunk, 0, toRead);
                if (n <= 0) break;
                buf.write(chunk, 0, n);
                if (length >= 0) remaining -= n;
            }
            JSObject ret = new JSObject();
            ret.put("base64", Base64.encodeToString(buf.toByteArray(), Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("READ_FAILED: " + e.getMessage());
        }
    }

    @PluginMethod
    public void savedFolders(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences(PREFS, 0);
        Set<String> set = sp.getStringSet(KEY_FOLDERS, new HashSet<>());
        JSArray arr = new JSArray();
        if (set != null) for (String s : set) arr.put(s);
        JSObject ret = new JSObject();
        ret.put("folders", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void forgetFolder(PluginCall call) {
        String uriStr = call.getString("treeUri");
        if (uriStr == null) { call.reject("MISSING_URI"); return; }
        SharedPreferences sp = getContext().getSharedPreferences(PREFS, 0);
        Set<String> existing = sp.getStringSet(KEY_FOLDERS, new HashSet<>());
        Set<String> set = new HashSet<>(existing != null ? existing : new HashSet<>());
        set.remove(uriStr);
        sp.edit().putStringSet(KEY_FOLDERS, set).apply();
        try {
            getContext().getContentResolver().releasePersistableUriPermission(
                Uri.parse(uriStr), Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception ignored) {}
        call.resolve();
    }

    private void rememberFolder(String uri) {
        SharedPreferences sp = getContext().getSharedPreferences(PREFS, 0);
        Set<String> existing = sp.getStringSet(KEY_FOLDERS, new HashSet<>());
        Set<String> set = new HashSet<>(existing != null ? existing : new HashSet<>());
        set.add(uri);
        sp.edit().putStringSet(KEY_FOLDERS, set).apply();
    }
}
