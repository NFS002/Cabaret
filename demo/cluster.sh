#!/bin/bash


# Function: Print a help message.
usage() {
  echo "Usage: $0" 1>&2
}

# Function: Exit with error.
exit_abnormal() {                              
  usage
  exit 1
}

if [ $# -gt 0 ]; then
    exit_abnormal
fi

gnome-terminal --window -- ./cluster_internal.sh $NETWORK_SIZE $HOST