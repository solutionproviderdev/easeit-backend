/* eslint-disable prettier/prettier */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const MapData = require('../schemas/MapData');

// Assuming MapData Schema is something like this:
// const mapDataSchema = new mongoose.Schema({
//   division: String,
//   districts: [{
//     name: String,
//     areas: [{
//       name: String,
//       visitCharge: Number
//     }]
//   }]
// });

const fetchAndStoreDarazData = async () => {
  //  console.log('Starting the data fetch and store process...');
    const startTime = new Date();

    const baseUrl = 'https://member.daraz.com.bd/locationtree/api/getSubAddressList';
    const fetchUrl = (addressId) => `${baseUrl}?countryCode=BD&page=addressEdit${addressId ? `&addressId=${addressId}` : ''}`;

    // Helper function to fetch data from the Daraz API
    const fetchData = async (url) => {
        try {
            const response = await axios.get(url);
            return response.data.module;
        } catch (error) {
          //console.error('Error fetching data:', error);
            return null;
        }
    };

    // Helper function to check if a district or area exists in the database
    const checkExists = async (name, parentName, level) => {
        const query = level === 'district'
                ? { division: parentName, 'districts.name': name }
                : { 'districts.areas.name': name, 'districts.name': parentName };
        const exists = await MapData.findOne(query).lean();
        return !!exists;
    };

    // Fetch and store divisions
    const divisions = await fetchData(fetchUrl(''));
    if (!divisions) return;

    for (const division of divisions) {
      //  console.log(`Processing division: ${division.name}`);

        // Fetch and store districts for each division
        const districts = await fetchData(fetchUrl(division.id));
        if (!districts) continue;

        for (const district of districts) {
            if (await checkExists(district.name, division.name, 'district')) {
              //  console.log(`District already exists: ${district.name}`);
                continue;
            }

          //  console.log(`Processing district: ${district.name}`);

            // Fetch and store areas for each district
            const areas = await fetchData(fetchUrl(district.id));
            if (!areas) continue;

            const areaData = areas.map((area) => ({
                name: area.name,
                visitCharge: 0, // Placeholder for visit charge logic
            }));

            // Push or update the district and its areas within the division
            await MapData.findOneAndUpdate(
                { division: division.name },
                {
                    $push: { districts: { name: district.name, areas: areaData } },
                },
                { upsert: true, new: true }
            );

          //  console.log(`Stored areas for district: ${district.name}`);
        }

      //  console.log(`Completed processing for division: ${division.name}`);
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
  //  console.log(`Data fetch and store process completed in ${duration} seconds.`);
};

module.exports = fetchAndStoreDarazData;
