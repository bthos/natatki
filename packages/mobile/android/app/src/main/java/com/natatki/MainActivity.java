package com.natatki;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import android.util.Log;
import android.os.Bundle;

public class MainActivity extends ReactActivity {
  private static final String TAG = "MainActivity";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // #region agent log
    try {
      Log.d(TAG, "MainActivity.onCreate called");
      Log.d(TAG, "savedInstanceState: " + (savedInstanceState != null ? "exists" : "null"));
    } catch (Exception e) {
      Log.e(TAG, "Error in onCreate logging", e);
    }
    // #endregion
    super.onCreate(savedInstanceState);
    // #region agent log
    try {
      Log.d(TAG, "MainActivity.onCreate super.onCreate completed");
    } catch (Exception e) {
      Log.e(TAG, "Error after super.onCreate", e);
    }
    // #endregion
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    // #region agent log
    try {
      Log.d(TAG, "getMainComponentName called, returning: natatki");
    } catch (Exception e) {
      Log.e(TAG, "Error in getMainComponentName", e);
    }
    // #endregion
    return "natatki";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
}
