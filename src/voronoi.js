import * as turf from '@turf/turf'

async function polygonDivide(polygonFeature, nDivisions) {
  let temp = turf.polygon([polygonFeature])
  let polygon = turf.cleanCoords(temp)
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
      let clippedFeature = turf.intersect(turf.featureCollection([feature, polygon]));
      let clippedFeatureArea = turf.area(clippedFeature);
      clippedFeature.properties.percentage = clippedFeatureArea / polygonArea;

      return clippedFeature;
  });
  // clippedVoronoiPolygons = turf.featureCollection(clippedVoronoiPolygons);

  let centroids = []

  for (const item of clippedVoronoiPolygons) {
    centroids.push(turf.centroid(item))
  }

  return {"polys": clippedVoronoiPolygons, "centroids": centroids, "areas": turf.area(turf.featureCollection(clippedVoronoiPolygons))};
}

export { polygonDivide }


// slumpa fram 5000 punkter inom polygonen bbox->polygon
// skapa n antal kluster med en centrumpunkt
// skapa voronoi diagram efter centumpunkterna
// klipp de nya areorna så de håller sig innanför polygonen