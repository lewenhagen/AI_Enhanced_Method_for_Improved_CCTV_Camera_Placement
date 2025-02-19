import * as turf from '@turf/turf'

async function polygonDivide(polygonFeature, nDivisions) {
  let temp = turf.polygon([polygonFeature])
    // Bounding box for the grid
  const polygon = turf.cleanCoords(temp)
  let polygonBbox = turf.bbox(polygon);

  let randomPoints = turf.randomPoint(5000, {bbox: polygonBbox});
  randomPoints.features = randomPoints.features.filter((feature) => {
      return(turf.booleanPointInPolygon(feature.geometry.coordinates, polygon));
  });

  let clusteredPoints = turf.clustersKmeans(randomPoints, {
      numberOfClusters: nDivisions,
  });

  let centroidPoints = [];
  for (let i = 0; i < nDivisions; i++) {
      let feature = clusteredPoints.features.find(
          function(feature) {
              return(feature.properties.cluster == i);
          }
      );
      centroidPoints[i] = turf.point(feature.properties.centroid);
  }

  let voronoiPolygons = turf.voronoi(
      {type: "FeatureCollection", features: centroidPoints},
      {bbox: polygonBbox}
  );

  let polygonArea = turf.area(polygon);
  let idealPieceArea = polygonArea / nDivisions;
  let clippedVoronoiPolygons = voronoiPolygons.features.map((feature, i) => {
      // console.log(feature)
      let clippedFeature = turf.intersect(turf.featureCollection([feature, polygon]));
      let clippedFeatureArea = turf.area(clippedFeature);
      clippedFeature.properties.percentage = clippedFeatureArea / idealPieceArea;
      // clippedFeature.properties.color = `#${Math.floor(Math.random() * 16777215).toString(16)}` 

      return clippedFeature;
  });
  // clippedVoronoiPolygons = turf.featureCollection(clippedVoronoiPolygons);

  let centroids = []

  for (const item of clippedVoronoiPolygons) {
    centroids.push(turf.centroid(item))
  }

  return {"areas": clippedVoronoiPolygons, "centroids": centroids};
}

export { polygonDivide }