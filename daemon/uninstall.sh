#!/bin/bash

echo "Geo-Run Daemon Uninstallation Script"

# Unload the LaunchDaemon
sudo launchctl unload /Library/LaunchDaemons/com.geo-run.daemon.plist

# Remove the LaunchDaemon plist
sudo rm /Library/LaunchDaemons/com.geo-run.daemon.plist

# Remove the application files
sudo rm -rf /Applications/geo-run

# Remove log files (optional - comment out if you want to keep logs)
sudo rm -rf /var/log/geo-run

echo "Uninstallation complete. The daemon has been removed from your system."
