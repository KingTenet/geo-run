#!/bin/bash

# Check for verbose flag
VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

echo "Running Applications:"
echo "-------------------"

if [[ $VERBOSE == true ]]; then
    # Show full command in verbose mode
    ps -ef |
        grep "\.app" |
        grep -v "grep" |
        grep -v "/System/Volumes" |
        grep -v "Extensions/" |
        while IFS= read -r line; do
            if [[ "$line" =~ /Applications/([^/]+)\.app ]]; then
                app_name="${BASH_REMATCH[1]}"
                pid=$(echo "$line" | awk '{print $2}')
                ppid=$(echo "$line" | awk '{print $3}')
                user=$(echo "$line" | awk '{print $1}')
                cmd=$(echo "$line" | cut -d' ' -f8-)
                echo "$app_name|$pid|$ppid|$user|$cmd"
            fi
        done
else
    # Show just the process name in normal mode
    ps -ef |
        grep "\.app" |
        grep -v "grep" |
        grep -v "/System/Volumes" |
        grep -v "Extensions/" |
        while IFS= read -r line; do
            if [[ "$line" =~ /Applications/([^/]+)\.app ]]; then
                app_name="${BASH_REMATCH[1]}"
                pid=$(echo "$line" | awk '{print $2}')
                ppid=$(echo "$line" | awk '{print $3}')
                user=$(echo "$line" | awk '{print $1}')
                cmd=$(echo "$line" | awk '{print $8}' | awk -F/ '{print $NF}')
                echo "$app_name|$pid|$ppid|$user|$cmd"
            fi
        done
fi |
    sort |
    awk -F'|' '
function print_group() {
    if (last_app != "") {
        print "\nApplication:", last_app
        print "Number of processes:", count
        print "Process details:"
        print processes
        print "-------------------"
    }
}

{
    if ($1 != last_app) {
        print_group()
        last_app = $1
        count = 1
        processes = sprintf("PID: %s (Parent: %s, User: %s)\nCommand: %s", $2, $3, $4, $5)
    } else {
        count++
        processes = processes "\n---\nPID: " $2 " (Parent: " $3 ", User: " $4 ")\nCommand: " $5
    }
}

END {
    print_group()
}'
