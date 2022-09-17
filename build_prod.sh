rm -R dist
npm run copy
parcel build --target dashboard --no-cache --public-url ./
parcel build --target webmap --no-cache --public-url ./
parcel build --target about --no-cache --public-url ./
cp dist/dashboard/*.js dist/
cp dist/dashboard/*.css dist/
cp dist/dashboard/*.jpg dist/
