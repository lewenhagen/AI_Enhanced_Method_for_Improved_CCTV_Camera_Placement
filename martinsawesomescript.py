import pandas as pd
import sys
import subprocess
import json

city='Malmoe' # City for slicing data
years_lst = [ 2016,2017,2018,2019 ]
radii_lst = [ 100, 50 ]
# methods_lst = ['bruteforce','hill_climb','building_walk']
methods_lst = ['bruteforce']

results_df = pd.DataFrame(columns=["method", "year", "radius", "num_startpoints", "execution_time", "best_score"])

def executeMethod(method, center, distance, distWeight, year):
    # print(method, center, distance, distWeight, year)
    result = subprocess.run(
        ["node",
        "./src/"+method+".js",
        str(center),         # coords (no space) — or pass lat and lon separately
        str(distance),       # distance
        str(distWeight),     # distWeight
        str(year)            # years,
        ],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        return result.stdout
        # print("Received from Node:", data)
    else:
        print("Error:", result.stderr)


for year in years_lst:
    # Read data from database for city={city} and for year={year}
    for radius in radii_lst:
        for method in methods_lst:
            if method == 'bruteforce':
                #Run method using radius={radius} on loaded data, store result in {result_list}
                result_list = executeMethod("bruteforce", "55.5636,12.9746", radius, "0.2", year)
                # print(type(list(result_list)))
            # elif method == 'hill_climb':
            #     #Run method using radius={radius} on loaded data, store result in {result_list}
            # elif method == 'building_walk':
                #Run method using radius={radius} on loaded data, store result in {result_list}
            else:
                print(f"Unkown method: {method}. Aborting.")
                sys.exit(1)

            # Example list of results for how it could look like after the bruteforce method has returned with execution_time 0.023 sec and best score 0.0087
            # result_list = ["bruteforce", 100, 10, 0.023, 0.0087]

            # Append as a new row
            results_df.loc[len(results_df)] = list(result_list)


results_df.to_csv("out.csv", index=False)
