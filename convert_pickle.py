#!/usr/bin/env python3 

import pickle
import json
import pandas as pd

result = []

with open('./malmo_from_boldt.pickle', 'rb') as f:
    data = pickle.load(f)
    #print(pickle.dumps(data))
    #print(data.shape())
    #data.to_csv("pickle.csv", sep=',', index=False, encoding='utf-8')

data = pd.read_pickle('./malmo_from_boldt.pickle')
for index, row in data.iterrows():
    temp = {}
    temp["size"] = row["total_count_with_vsa"]
    temp["latitude"] = row["latlong_geometry"].y
    temp["longitude"] = row["latlong_geometry"].x
    temp["neighbors"] = []

    for point in row["neighbors"]:
        temp["neighbors"].append([point[1].y, point[1].x])
        # print(point[0])
        # print(point[1])
    # temp["neighbors"] = row["total_count_with_vsa"]
    # # print(row["latlong_geometry"], row["total_count_with_vsa"], row["neighbors"])
    print("Total count with VSA: " + str(row["total_count_with_vsa"]))
    print("Length of neighbors: " + str(len(row["neighbors"])))
    result.append(temp)

json_object = json.dumps(result, indent=4)
with open("crimes_from_martin/from_martin.json", "w") as outfile:
    outfile.write(json_object)
