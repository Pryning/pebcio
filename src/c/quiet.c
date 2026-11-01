#include <pebble.h>

// Exposed to JavaScript through FFI as Natives.quietTimeActive():
// Alloy has no Quiet Time API of its own.
int32_t quietTimeActive(void) {
  return quiet_time_is_active() ? 1 : 0;
}
