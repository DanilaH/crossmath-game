package com.danilah.crossmath.ads;
/** Accept JSON numeric classes without Capacitor getLong's small-Integer fallback. */
public final class BridgeNumbers {
 private BridgeNumbers(){}
 public static long counter(Object raw){
  if(!(raw instanceof Number))return -1;double value=((Number)raw).doubleValue();
  return Double.isFinite(value)&&value>=0&&value<=9007199254740991d&&value==Math.rint(value)?((Number)raw).longValue():-1;
 }
}
