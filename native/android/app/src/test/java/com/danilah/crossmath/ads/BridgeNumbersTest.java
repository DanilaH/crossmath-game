package com.danilah.crossmath.ads;
import org.junit.Test;
import static org.junit.Assert.*;
public class BridgeNumbersTest {
 @Test public void acceptsSmallIntegerLargeLongAndIntegralDouble(){assertEquals(1,BridgeNumbers.counter(Integer.valueOf(1)));assertEquals(4294967296L,BridgeNumbers.counter(Long.valueOf(4294967296L)));assertEquals(4,BridgeNumbers.counter(Double.valueOf(4)));assertEquals(0,BridgeNumbers.counter(0));}
 @Test public void rejectsInvalidCounters(){for(Object v:new Object[]{null,"1",true,-1,1.2,Double.NaN,Double.POSITIVE_INFINITY,9007199254740992d})assertEquals(-1,BridgeNumbers.counter(v));}
}
