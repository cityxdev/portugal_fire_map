#!/bin/bash

rm -r data_dir/shapefiles
rm -r data_dir/csw
rm -r data_dir/gwc-layers
rm -r data_dir/layergroups
rm -r data_dir/layouts
rm -r data_dir/monitoring
rm -r data_dir/printing
rm -r data_dir/security
rm -r data_dir/styles
rm -r data_dir/user_projections
rm -r data_dir/workspaces
rm data_dir/global.xml
rm data_dir/gwc-gs.xml
rm data_dir/logging.xml
rm data_dir/wps.xml

docker cp portugal_fire_map_container:/opt/geoserver/data_dir/shapefiles ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/csw ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/gwc-layers ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/layergroups ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/layouts ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/monitoring ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/printing ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/security ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/styles ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/user_projections ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/workspaces ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/global.xml ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/gwc-gs.xml ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/logging.xml ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/wps.xml ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/.updatepassword.lock ./data_dir/
docker cp portugal_fire_map_container:/opt/geoserver/data_dir/controlflow.properties ./data_dir/
chown -R $(logname) data_dir
