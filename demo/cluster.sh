#!/bin/bash

# This is the default network size, although
# it is overwritten by the -s option
# provided at the command line.
NETWORK_SIZE=5

# This is the default host address and port
# in the form <IpV4>:<Port> that each node
# spawned by this script will attempt to join.
# It is overwritten by the -h option provided
# at the command line. 
# If this argument is ommitted, the nodes will not join,
# but can be configured later manually
# A chord server must 
# be running at this address for the argument 
# to be valid.
HOST=""

# Function: Print a help message.
usage() {
  echo "Usage: $0 [ -h HOST ] [ -s NETWORK_SIZE ]" 1>&2
}

# Function: Exit with error.
exit_abnormal() {                              
  usage
  exit 1
}

while getopts ":s:h:" options; do
    case "${options}" in
        h) 
            HOST=${OPTARG}
            ;;
        s) 
            NETWORK_SIZE=${OPTARG}
            ;;
        :)
            echo "Error: -${OPTARG} requires an argument."
            exit_abnormal
            ;;
        *)
            echo "Error: Unknown argument -${OPTARG}"
            exit_abnormal
            ;;
        \?)
            echo "Error: Unknown argument -${OPTARG}"
            exit_abnormal
            ;;
    esac
done

shift "$((OPTIND-1))"

if  ! [[ $# -eq 0 ]]; then
    exit_abnormal
fi

gnome-terminal --window -- ./cluster_internal $NETWORK_SIZE $HOST