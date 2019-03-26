# Cabaret
Cabaret is a node.js implementation of the chord protocol, adapated for use
as a supply demand dispatch system for ride microservice architectures.
Cabaret is based on the DISCO service designed by Uber, and is intended as a suitable alternative.

## Cabaret uses gRPC for its maintenance protocol

### API

join(host)

dump(host)

range(range)

set(key, value)

ping(host)

state(host)

lookup(key)

get(key)

has(key)

del(key)