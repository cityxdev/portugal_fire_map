#!/bin/bash


if [ -d /opt/geoserver/data_dir/gwc/ ]
then
	if [ -z "$(ls -A /opt/geoserver/data_dir/gwc/)" ]; then
     unzip -o /opt/geoserver/data_dir/gwc.zip -d /opt/geoserver/ && rm /opt/geoserver/data_dir/gwc.zip
     echo "Build GWC in empty dir"
	else
    echo "GWC already in place"
	fi
else
  mkdir -p /opt/geoserver/data_dir/gwc/
	unzip -o /opt/geoserver/data_dir/gwc.zip -d /opt/geoserver/ && rm /opt/geoserver/data_dir/gwc.zip
  echo "Build GWC in new dir"
fi


