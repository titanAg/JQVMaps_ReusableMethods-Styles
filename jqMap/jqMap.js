// Initializes a new custom jqvMap
// map -> the query map object (in form <div id="mapid">)
// mapString -> vmap model selection string (example: 'usa_en', 'canada_en', 'world_en')
// countMap -> JSON of database regions.counts (with attributes: state_prov and count)
// dataset -> merged dataset of all database company records (JSON array)
async function initMap(map, mapString, countMap, dataset) {
    var regionMap = await getUSList(countMap, dataset);
    console.log(regionMap);

    data = {}
    for (var prop in regionMap) {
      data[JSON.stringify(prop).toLowerCase()] = JSON.stringify(regionMap[prop][1]);
    }
    console.log(data);


    var isSelected = false;
    var selectedCode = "";
    map.vectorMap({
        map: mapString,
        enableZoom: true,
        showTooltip: true,
        showLabels: false,
        backgroundColor: '#555555',
        selectedColor: "#ABEBC6",
        hoverColor: "#ABEBC6",
        scaleColors: ["#FBEEE6", "#2471A3"],
        values: data,
        normalizeFunction: 'linear',
        onRegionSelect: function(element, code, region) {
          selectedCode = code;
        },
        onRegionClick: function(element, code, region) {
          // clear grid
          document.getElementById("region-grid-container").innerHTML = '';
          $("#region-table").hide();
          // show grid if selected
          if (isSelected && code == selectedCode) {
            isSelected = false;
            selectedCode = "";
          }
          else {
            isSelected = true;
            // document.getElementById("region-grid-container").innerHTML = '';
            let regionList = regionMap[code.toUpperCase()][2];
            if (regionList.length > 0) {
              $("#region-table").show();
              initRegionTable(regionList, region);
            }
            else {
              alert("This region currently has no records.");
              return false;
            }
          }
        },
        onLabelShow: function(event, label, code) { // custom tooltip 
          let fullName = regionMap[code.toUpperCase()][0];
          let companyCount = regionMap[code.toUpperCase()][1];
          label.html(`<div class="map-tooltip">
                        <div class="centered">
                          <h1 class="tooltip-heading">${fullName}</h1>
                          <h2 class="tooltip-count">${companyCount}</h2>
                          <h5 class="tooltip-sub">Click to see records</h5>
                        </div>
                      </div>`);
        }
      });

      // var colorMap = await getColorMapping(regionMap);

      // for (var prop in colorMap) {
      //   var code = prop.toLowerCase();
      //   var color = {[code]: [colorMap[prop]]}
      //   map.vectorMap('set', 'colors', color);
      // }


}

async function getColorMapping(regionMap) {
  var colors = ["#FBEEE6", "#D4E6F1", "#A9CCE3", "#7FB3D5", "#5499C7", "#2980B9", "#2471A3"]
  var range = [0,1,3,5,8,11,14]
  var mapping = []
  for (var prop in regionMap) {
    for (var i = range.length-1; i >= 0; i--) {
      if (regionMap[prop][1] >= range[i]) {
        mapping[prop] = colors[i];
        break;
      }
    }
  }
  return mapping;
}

function initRegionTable(data, caption) {
  var table = document.createElement("table");
  table.id = "region-grid";
  document.getElementById("region-grid-container").append(table);
  initGrid($("#region-grid"), caption + " Companies", data,
                  ["Ticker", "Source", "Score", "Name", "Description", "Industry", "Employees", "CEO", "City", "Revenue", ""], 
                  [
                          { name: "ticker", hidden: true }, // So ticker can be sent to details page from rowData
                          { name: "cik", width: "200", align: "center", formatter: ZoomFmpFormatter },
                          { name: "score", width: "120", formatter: ScoreFormatter },
                          { name: "name", width: "250", formatter: textFormatter },
                          { name: "co_description", width: "300", formatter: textFormatter },
                          { name: "industry", width: "275", formatter: textFormatter  },
                          { name: "fulltime_employees", 
                            width: "175", 
                            formatter: 'integer',
                            sorttype:'number',
                            formatoptions: { thousandsSeparator: ',', defaultValue: "N/A" },
                            
                          },
                          { name: "ceo", width: "300", formatter: textFormatter  },
                          { name: "city", width: "175", formatter: textFormatter  },
                          { name: "revenue", 
                            width: "225",
                            sorttype:'number',
                            formatter:currencyFormatter,
                            formatoptions: {prefix:'$', thousandsSeparator:',', defaultValue: "N/A"}
                          },
                          {name:'detailsLink', 
                            edittype:'select', 
                            width: "225",
                            align: "center",
                            sortable: false,
                            formatter: getDetailsLink, 
                          },
                  ],
                  function(id) {
                      var rowData = $("#region-grid").jqGrid("getRowData", id);
                      if (rowData.ticker) {
                        window.open("details.html?company_name=" + rowData.name + "&ticker=" + rowData.ticker, "_self");
                      } 
                      else {
                          alert("No ticker available for " + rowData.name);
                      }
                  });
}


// Helper function to clean up the values coming from the database
// TODO clean data in database so that this is not required
async function getUSList(counts, dataset) {
  var states = [];
  var reverseLookup = [];
  // Build complete state json mapping
  $.each( allStates, function( key, val ) {
      states[key] = [val, 0, []]
      reverseLookup[val.toUpperCase()] = key;
  });
  // Add counts for dataset records
  $.each(counts, function( key, val ) {
    let state = counts[key]["state_prov"];
    if (state) {
      if (reverseLookup[state]) {
        let count = parseInt(counts[key]["SUM(sp.c)"]);
        states[reverseLookup[state]][1] += count
      }
    }
  });
    // Add sub datasets for dataset records
    dataset.forEach(record => {
      if (record.state_prov) {
        let region = record.state_prov.toUpperCase();
        if (reverseLookup[region] && states[reverseLookup[region]]) {
          states[reverseLookup[region]][2].push(record);
        }
      }

    });
  return states;
}

// static mapping of state names and abbreviations
// found on github (quick workaround)
const allStates = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AS": "American Samoa",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FM": "Federated States Of Micronesia",
  "FL": "Florida",
  "GA": "Georgia",
  "GU": "Guam",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MH": "Marshall Islands",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "MP": "Northern Mariana Islands",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PW": "Palau",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VI": "Virgin Islands",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
}