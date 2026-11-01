/* FFI GENERATED FILE; DO NOT EDIT! */

#include "xsffi.h"

txAPI* XS = NULL;

extern int32_t quietTimeActive();

static void xs_quietTimeActive(txMachine* the) {
	int32_t result = quietTimeActive();
	XS->fromInteger(the, mxResult, (txInteger)result);
}

void fxBuildFFI(txMachine* the, txAPI* api) {
	XS = api;
	XS->newHostFunction(the, xs_quietTimeActive, 0, 0, 0);
	XS->push(the, mxThis);
	XS->defineID(the, XS->id(the, "quietTimeActive"), 0, 0x0E);
	XS->pop(the);
}
