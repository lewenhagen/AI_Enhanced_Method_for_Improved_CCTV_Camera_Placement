import * as turf from '@turf/turf'

async function calculateLineCoverage(line, polygons) {
    // Step 1: Measure total line length
const totalLineLength = turf.length(line, { units: 'meters' });

// Step 2: Find intersection points
let splitPoints = [];
polygons.forEach(polygon => {
    const intersections = turf.lineIntersect(line, polygon.polygon);
    intersections.features.forEach(intersection => {
        splitPoints.push(intersection);
    });
});

// Step 3: Slice the line at intersection points
let segments = [];
if (splitPoints.length > 0) {
    let prevPoint = line.geometry.coordinates[0];

    splitPoints.forEach(point => {
        let slicedSegment = turf.lineSlice(turf.point(prevPoint), point, line);
        segments.push(slicedSegment);
        prevPoint = point.geometry.coordinates;
    });

    // Add the last segment
    let lastSegment = turf.lineSlice(turf.point(prevPoint), turf.point(line.geometry.coordinates[line.geometry.coordinates.length - 1]), line);
    segments.push(lastSegment);
} else {
    segments.push(line);
}

// Step 4: Determine covered & uncovered segments
let coveredLength = 0;
let uncoveredLength = 0;
let coveredSegments = [];
let uncoveredSegments = [];

segments.forEach(segment => {
    let midpoint = turf.along(segment, turf.length(segment, { units: 'meters' }) / 2, { units: 'meters' });
    let isCovered = polygons.some(polygon => turf.booleanPointInPolygon(midpoint, polygon.polygon));

    let segmentLength = turf.length(segment, { units: 'meters' });
    if (isCovered) {
        coveredLength += segmentLength;
        coveredSegments.push(segment);
    } else {
        uncoveredLength += segmentLength;
        uncoveredSegments.push(segment);
    }
});


    console.log(`Total Line Length: ${totalLineLength.toFixed(2)} meters`);
    console.log(`Covered Length: ${coveredLength.toFixed(2)} meters`);
    console.log(`Uncovered Length: ${uncoveredLength.toFixed(2)} meters`);
}


export { calculateLineCoverage }