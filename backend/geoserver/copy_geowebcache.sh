#!/bin/bash

rm data_dir/gwc.zip
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/gwc ./data_dir/
zip -r data_dir/gwc.zip data_dir/gwc >/dev/null
rm -r data_dir/gwc/
chown -R $(logname) data_dir
