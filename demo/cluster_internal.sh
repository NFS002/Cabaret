#!/bin/bash


# Source parser
. parser.sh

# Parse config file
read_ini cluster.ini

declare -a sections=(${INI__ALL_SECTIONS})
declare remainder=$(( $INI__GLOBAL__HOSTS - $INI__NUMSECTIONS ))

    
for i in "${sections[@]}"
do
    if ! [ "$i" == "GLOBAL" ]; then

        declare port_name=INI__"$i"__PORT
        declare range_name=INI__"$i"__RANGE
        declare join_name=INI__"$i"__JOIN
        declare update_name=INI__"$i"__UPDATE

        declare update=${!update_name}
        declare range=${!range_name}
        declare port=${!port_name}
        declare join=${!join_name}


        # Default join
        if [[ -z "$join" ]]; then
            join=$INI__GLOBAL__JOIN
        fi

        # Default update
        if [[ -z "$update" ]] && [[ -n "$range" ]] ; then
            update=$INI__GLOBAL__UPDATE
        fi

        # Command line parameters for cli.js

        # Port number
        if [[ -n "$port" ]]; then
            p_args="-p="$port""
        else
            p_args=""
        fi

        # Host address to join
        if [[ -n "${join// }" ]]; then
            j_args="--join="$join""
        else
            j_args=""
        fi

        # Driver_id range
        if [[ -n "$range" ]]; then
            r_args="--range="$range""
        else
            r_args=""
        fi

        # Update option
        if [[ -n "$update" ]]; then
            u_args="--update="$update""
        else
            u_args=""
        fi

        gnome-terminal --tab -t "Tab: $i" -- npm run cli -- $p_args $j_args $r_args $u_args -d


        unset ARGS
    fi
done


# Fill all remaining sections with defaults
if  [ "$remainder" -gt 0 ] && [ -n "${INI__GLOBAL__JOIN// }" ]; then
    j_args="--join="$INI__GLOBAL__JOIN""
    for (( j=0;j<="$remainder";j++ ))
    do
        gnome-terminal --tab -t "Tab: G" -- npm run cli -- $j_args -d
    done
fi
