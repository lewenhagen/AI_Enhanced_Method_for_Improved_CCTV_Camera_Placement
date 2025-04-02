import * as turf from '@turf/turf'

async function getAreaWithoutBuildings(data) {
    let bbox = data.boundingBox
    
    const buildings = data.buildings
    // console.log(bbox)
    
    const turfBuildings = turf.featureCollection(buildings.map((item) => {
        return turf.feature(item.geometry)
    }))
    
    
    let result = turf.feature(bbox.geometry)

    turfBuildings.features.forEach(removeMe => {
        const difference = turf.difference(turf.featureCollection([result, removeMe]))
        if (difference) {
            result = difference
        }
    })


    // return turf.randomPoint(1, {bbox: result})
    return result
}

export { getAreaWithoutBuildings }