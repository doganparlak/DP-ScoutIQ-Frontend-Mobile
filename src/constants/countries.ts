// src/constants/countries.ts

// ISO 3166-ish list of sovereign states + a few common territories.
// Feel free to prune/adjust to your product needs.
export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon",
  "Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica",
  "Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia","Democratic Republic of the Congo","Denmark","Djibouti","Dominica",
  "Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji",
  "Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
  "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia",
  "Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands",
  "Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden",
  "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
  "Tunisia","Türkiye","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",

  // (Common territories/regions often included in pickers)
  "Åland Islands","American Samoa","Anguilla","Aruba","Bermuda","Bonaire, Sint Eustatius and Saba","British Virgin Islands",
  "Cayman Islands","Christmas Island","Cocos (Keeling) Islands","Cook Islands","Curaçao","Faroe Islands","French Guiana",
  "French Polynesia","French Southern Territories","Gibraltar","Greenland","Guadeloupe","Guam","Guernsey","Hong Kong SAR China",
  "Isle of Man","Jersey","Macau SAR China","Martinique","Mayotte","Montserrat","New Caledonia","Niue","Norfolk Island",
  "Northern Mariana Islands","Pitcairn Islands","Puerto Rico","Réunion","Saint Barthélemy","Saint Helena, Ascension and Tristan da Cunha",
  "Saint Martin","Saint Pierre and Miquelon","Sint Maarten","South Georgia & South Sandwich Islands","Tokelau","Turks and Caicos Islands",
  "U.S. Outlying Islands","U.S. Virgin Islands","Wallis and Futuna","Western Sahara"
];

// Alpha-2 short codes (curated + special cases). Add more as needed.
export const COUNTRY_CODE2: Record<string, string> = {
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  Bolivia: "BO",
  Bosnia: "BA",
  "Bosnia and Herzegovina": "BA",
  Brazil: "BR",
  Canada: "CA",
  Chile: "CL",
  China: "CN",
  Colombia: "CO",
  Croatia: "HR",
  Cyprus: "CY",
  Czechia: "CZ",
  Denmark: "DK",
  "Dominican Republic": "DO",
  Ecuador: "EC",
  Egypt: "EG",
  England: "GB", // in case you ever use it
  Finland: "FI",
  France: "FR",
  Georgia: "GE",
  Germany: "DE",
  Ghana: "GH",
  Greece: "GR",
  Hungary: "HU",
  Iceland: "IS",
  India: "IN",
  Indonesia: "ID",
  Iran: "IR",
  Iraq: "IQ",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Jamaica: "JM",
  Japan: "JP",
  Jordan: "JO",
  Kazakhstan: "KZ",
  Kenya: "KE",
  Kuwait: "KW",
  Latvia: "LV",
  Lebanon: "LB",
  Lithuania: "LT",
  Luxembourg: "LU",
  Malaysia: "MY",
  Mexico: "MX",
  Morocco: "MA",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Nigeria: "NG",
  "North Macedonia": "MK",
  Norway: "NO",
  Pakistan: "PK",
  Panama: "PA",
  Paraguay: "PY",
  Peru: "PE",
  Philippines: "PH",
  Poland: "PL",
  Portugal: "PT",
  Qatar: "QA",
  Romania: "RO",
  Russia: "RU",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  Serbia: "RS",
  Singapore: "SG",
  Slovakia: "SK",
  Slovenia: "SI",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Türkiye: "TR",
  Ukraine: "UA",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  Uruguay: "UY",
  Uzbekistan: "UZ",
  Venezuela: "VE",
  Vietnam: "VN",
};

export function countryToCode2(name?: string | null): string {
  if (!name) return '';
  const direct = COUNTRY_CODE2[name];
  if (direct) return direct;
  // Fallback: make a 3-letter code from letters in the name
  const letters = (name.normalize('NFKD').replace(/[^\p{Letter}]+/gu, ' ').trim() || '').split(/\s+/);
  if (!letters.length) return '';
  const first = letters[0].slice(0, 3).toUpperCase();
  return first;
}

export function code2ToCountry(code?: string | null): string {
  if (!code) return '';
  const entry = Object.entries(COUNTRY_CODE2).find(([, c]) => c.toUpperCase() === code.toUpperCase());
  return entry ? entry[0] : '';
}