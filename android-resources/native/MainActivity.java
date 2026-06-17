package app.lovable.tempokey;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TempoKeyPermissions.class);
        registerPlugin(TempoKeyFolderPicker.class);
        super.onCreate(savedInstanceState);
    }
}
