#!/bin/bash

# Check for --dry-run argument
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "DRY RUN MODE - No processes will actually be terminated"
    echo "----------------------------------------"
fi

# List of applications to terminate
APPS_TO_KILL=(
    "Visual Studio Code"
    "Google Chrome"
    "Firefox"
    "Safari"
)

for app in "${APPS_TO_KILL[@]}"; do
    echo "Looking for processes of: $app"

    # Find processes including both the .app path and direct executable
    pids=$(ps -ef | grep -i "/Applications/${app}.app" |
        grep -v "grep" |
        grep -v "/System/Volumes" |
        grep -v "Extensions/" |
        awk '{print $2}')

    if [[ -n "$pids" ]]; then
        echo "Found processes for $app:"
        for pid in $pids; do
            cmd=$(ps -p $pid -o comm=)
            user=$(ps -p $pid -o user=)
            ppid=$(ps -p $pid -o ppid=)
            if [[ $DRY_RUN == true ]]; then
                echo "Would kill PID $pid (Parent: $ppid, User: $user): $cmd"
            else
                echo "Killing PID $pid (Parent: $ppid, User: $user): $cmd"
                kill -9 $pid # Using SIGKILL for more forceful termination
            fi
        done
    else
        echo "No processes found for $app"
    fi
    echo "----------------------------------------"
done

if [[ $DRY_RUN == true ]]; then
    echo "Dry run complete - no processes were actually terminated"
else
    echo "Process termination complete"
fi
