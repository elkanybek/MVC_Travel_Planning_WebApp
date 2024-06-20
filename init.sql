DROP DATABASE IF EXISTS "TravelooDB";
CREATE DATABASE "TravelooDB";

\c TravelooDB;
DROP TYPE IF EXISTS trip_status;
CREATE TYPE trip_status AS ENUM ('planning', 'ready', 'in progress', 'complete');

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255),
  biography VARCHAR(100)
);

DROP TABLE IF EXISTS countries;
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  ISO CHAR(2) NOT NULL UNIQUE
);

DROP TABLE IF EXISTS trips;
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status trip_status NOT NULL DEFAULT 'planning',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  country_id INTEGER  REFERENCES countries(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS user_trip;
CREATE TABLE user_trip (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, trip_id)
);

DROP TABLE IF EXISTS activities;
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  created_at TIMESTAMP,
  edited_at TIMESTAMP,
  trip_id INTEGER  REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS luggages;
CREATE TABLE luggages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  amount INTEGER,
  type VARCHAR(50),
  trip_id INTEGER  REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);


DROP TABLE IF EXISTS budgets;
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  amount_spent NUMERIC,
  spending_limit NUMERIC,
  remainder NUMERIC,
  trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO countries (Name, ISO) VALUES ('Afghanistan', 'AF');
INSERT INTO countries (Name, ISO) VALUES ('Albania', 'AL');
INSERT INTO countries (Name, ISO) VALUES ('Algeria', 'DZ');
INSERT INTO countries (Name, ISO) VALUES ('American Samoa', 'AS');
INSERT INTO countries (Name, ISO) VALUES ('Andorra', 'AD');
INSERT INTO countries (Name, ISO) VALUES ('Angola', 'AO');
INSERT INTO countries (Name, ISO) VALUES ('Anguilla', 'AI');
INSERT INTO countries (Name, ISO) VALUES ('Antarctica', 'AQ');
INSERT INTO countries (Name, ISO) VALUES ('Antigua and Barbuda', 'AG');
INSERT INTO countries (Name, ISO) VALUES ('Argentina', 'AR');
INSERT INTO countries (Name, ISO) VALUES ('Armenia', 'AM');
INSERT INTO countries (Name, ISO) VALUES ('Aruba', 'AW');
INSERT INTO countries (Name, ISO) VALUES ('Australia', 'AU');
INSERT INTO countries (Name, ISO) VALUES ('Austria', 'AT');
INSERT INTO countries (Name, ISO) VALUES ('Azerbaijan', 'AZ');
INSERT INTO countries (Name, ISO) VALUES ('Bahamas', 'BS');
INSERT INTO countries (Name, ISO) VALUES ('Bahrain', 'BH');
INSERT INTO countries (Name, ISO) VALUES ('Bangladesh', 'BD');
INSERT INTO countries (Name, ISO) VALUES ('Barbados', 'BB');
INSERT INTO countries (Name, ISO) VALUES ('Belarus', 'BY');
INSERT INTO countries (Name, ISO) VALUES ('Belgium', 'BE');
INSERT INTO countries (Name, ISO) VALUES ('Belize', 'BZ');
INSERT INTO countries (Name, ISO) VALUES ('Benin', 'BJ');
INSERT INTO countries (Name, ISO) VALUES ('Bermuda', 'BM');
INSERT INTO countries (Name, ISO) VALUES ('Bhutan', 'BT');
INSERT INTO countries (Name, ISO) VALUES ('Bosnia and Herzegovina', 'BA');
INSERT INTO countries (Name, ISO) VALUES ('Botswana', 'BW');
INSERT INTO countries (Name, ISO) VALUES ('Bouvet Island', 'BV');
INSERT INTO countries (Name, ISO) VALUES ('Brazil', 'BR');
INSERT INTO countries (Name, ISO) VALUES ('British Indian Ocean Territory', 'IO');
INSERT INTO countries (Name, ISO) VALUES ('Brunei Darussalam', 'BN');
INSERT INTO countries (Name, ISO) VALUES ('Bulgaria', 'BG');
INSERT INTO countries (Name, ISO) VALUES ('Burkina Faso', 'BF');
INSERT INTO countries (Name, ISO) VALUES ('Burundi', 'BI');
INSERT INTO countries (Name, ISO) VALUES ('Cambodia', 'KH');
INSERT INTO countries (Name, ISO) VALUES ('Cameroon', 'CM');
INSERT INTO countries (Name, ISO) VALUES ('Canada', 'CA');
INSERT INTO countries (Name, ISO) VALUES ('Cape Verde', 'CV');
INSERT INTO countries (Name, ISO) VALUES ('Cayman Islands', 'KY');
INSERT INTO countries (Name, ISO) VALUES ('Central African Republic', 'CF');
INSERT INTO countries (Name, ISO) VALUES ('Chad', 'TD');
INSERT INTO countries (Name, ISO) VALUES ('Chile', 'CL');
INSERT INTO countries (Name, ISO) VALUES ('China', 'CN');
INSERT INTO countries (Name, ISO) VALUES ('Christmas Island', 'CX');
INSERT INTO countries (Name, ISO) VALUES ('Cocos (Keeling) Islands', 'CC');
INSERT INTO countries (Name, ISO) VALUES ('Colombia', 'CO');
INSERT INTO countries (Name, ISO) VALUES ('Comoros', 'KM');
INSERT INTO countries (Name, ISO) VALUES ('Congo', 'CG');
INSERT INTO countries (Name, ISO) VALUES ('Cook Islands', 'CK');
INSERT INTO countries (Name, ISO) VALUES ('Costa Rica', 'CR');
INSERT INTO countries (Name, ISO) VALUES ('Croatia', 'HR');
INSERT INTO countries (Name, ISO) VALUES ('Cuba', 'CU');
INSERT INTO countries (Name, ISO) VALUES ('Cyprus', 'CY');
INSERT INTO countries (Name, ISO) VALUES ('Czech Republic', 'CZ');
INSERT INTO countries (Name, ISO) VALUES ('Denmark', 'DK');
INSERT INTO countries (Name, ISO) VALUES ('Djibouti', 'DJ');
INSERT INTO countries (Name, ISO) VALUES ('Dominica', 'DM');
INSERT INTO countries (Name, ISO) VALUES ('Dominican Republic', 'DO');
INSERT INTO countries (Name, ISO) VALUES ('Ecuador', 'EC');
INSERT INTO countries (Name, ISO) VALUES ('Egypt', 'EG');
INSERT INTO countries (Name, ISO) VALUES ('El Salvador', 'SV');
INSERT INTO countries (Name, ISO) VALUES ('Equatorial Guinea', 'GQ');
INSERT INTO countries (Name, ISO) VALUES ('Eritrea', 'ER');
INSERT INTO countries (Name, ISO) VALUES ('Estonia', 'EE');
INSERT INTO countries (Name, ISO) VALUES ('Ethiopia', 'ET');
INSERT INTO countries (Name, ISO) VALUES ('Falkland Islands (Malvinas)' ,'FK');
INSERT INTO countries (Name, ISO) VALUES ('Faroe Islands', 'FO');
INSERT INTO countries (Name, ISO) VALUES ('Fiji', 'FJ');
INSERT INTO countries (Name, ISO) VALUES ('Finland', 'FI');
INSERT INTO countries (Name, ISO) VALUES ('France', 'FR');
INSERT INTO countries (Name, ISO) VALUES ('French Guiana', 'GF');
INSERT INTO countries (Name, ISO) VALUES ('French Polynesia', 'PF');
INSERT INTO countries (Name, ISO) VALUES ('French Southern Territories', 'TF');
INSERT INTO countries (Name, ISO) VALUES ('Gabon', 'GA');
INSERT INTO countries (Name, ISO) VALUES ('Gambia', 'GM');
INSERT INTO countries (Name, ISO) VALUES ('Georgia', 'GE');
INSERT INTO countries (Name, ISO) VALUES ('Germany', 'DE');
INSERT INTO countries (Name, ISO) VALUES ('Ghana', 'GH');
INSERT INTO countries (Name, ISO) VALUES ('Gibraltar', 'GI');
INSERT INTO countries (Name, ISO) VALUES ('Greece', 'GR');
INSERT INTO countries (Name, ISO) VALUES ('Greenland', 'GL');
INSERT INTO countries (Name, ISO) VALUES ('Grenada', 'GD');
INSERT INTO countries (Name, ISO) VALUES ('Guadeloupe', 'GP');
INSERT INTO countries (Name, ISO) VALUES ('Guam', 'GU');
INSERT INTO countries (Name, ISO) VALUES ('Guatemala', 'GT');
INSERT INTO countries (Name, ISO) VALUES ('Guernsey', 'GG');
INSERT INTO countries (Name, ISO) VALUES ('Guinea', 'GN');
INSERT INTO countries (Name, ISO) VALUES ('Guinea-Bissau', 'GW');
INSERT INTO countries (Name, ISO) VALUES ('Guyana', 'GY');
INSERT INTO countries (Name, ISO) VALUES ('Haiti', 'HT');
INSERT INTO countries (Name, ISO) VALUES ('Heard Island and McDonald Islands', 'HM');
INSERT INTO countries (Name, ISO) VALUES ('Holy See (Vatican City State)' ,'VA');
INSERT INTO countries (Name, ISO) VALUES ('Honduras', 'HN');
INSERT INTO countries (Name, ISO) VALUES ('Hong Kong', 'HK');
INSERT INTO countries (Name, ISO) VALUES ('Hungary', 'HU');
INSERT INTO countries (Name, ISO) VALUES ('Iceland', 'IS');
INSERT INTO countries (Name, ISO) VALUES ('India', 'IN');
INSERT INTO countries (Name, ISO) VALUES ('Indonesia', 'ID');
INSERT INTO countries (Name, ISO) VALUES ('Iran', 'IR');
INSERT INTO countries (Name, ISO) VALUES ('Iraq', 'IQ');
INSERT INTO countries (Name, ISO) VALUES ('Ireland', 'IE');
INSERT INTO countries (Name, ISO) VALUES ('Isle of Man', 'IM');
INSERT INTO countries (Name, ISO) VALUES ('Israel', 'IL');
INSERT INTO countries (Name, ISO) VALUES ('Italy', 'IT');
INSERT INTO countries (Name, ISO) VALUES ('Jamaica', 'JM');
INSERT INTO countries (Name, ISO) VALUES ('Japan', 'JP');
INSERT INTO countries (Name, ISO) VALUES ('Jersey', 'JE');
INSERT INTO countries (Name, ISO) VALUES ('Jordan', 'JO');
INSERT INTO countries (Name, ISO) VALUES ('Kazakhstan', 'KZ');
INSERT INTO countries (Name, ISO) VALUES ('Kenya', 'KE');
INSERT INTO countries (Name, ISO) VALUES ('Kiribati', 'KI');
INSERT INTO countries (Name, ISO) VALUES ('Kuwait', 'KW');
INSERT INTO countries (Name, ISO) VALUES ('Kyrgyzstan', 'KG');
INSERT INTO countries (Name, ISO) VALUES ('Lao Peoples Democratic Republic', 'LA');
INSERT INTO countries (Name, ISO) VALUES ('Latvia', 'LV');
INSERT INTO countries (Name, ISO) VALUES ('Lebanon', 'LB');
INSERT INTO countries (Name, ISO) VALUES ('Lesotho', 'LS');
INSERT INTO countries (Name, ISO) VALUES ('Liberia', 'LR');
INSERT INTO countries (Name, ISO) VALUES ('Libya', 'LY');
INSERT INTO countries (Name, ISO) VALUES ('Liechtenstein', 'LI');
INSERT INTO countries (Name, ISO) VALUES ('Lithuania', 'LT');
INSERT INTO countries (Name, ISO) VALUES ('Luxembourg', 'LU');
INSERT INTO countries (Name, ISO) VALUES ('Macao', 'MO');
INSERT INTO countries (Name, ISO) VALUES ('Madagascar', 'MG');
INSERT INTO countries (Name, ISO) VALUES ('Malawi', 'MW');
INSERT INTO countries (Name, ISO) VALUES ('Malaysia', 'MY');
INSERT INTO countries (Name, ISO) VALUES ('Maldives', 'MV');
INSERT INTO countries (Name, ISO) VALUES ('Mali', 'ML');
INSERT INTO countries (Name, ISO) VALUES ('Malta', 'MT');
INSERT INTO countries (Name, ISO) VALUES ('Marshall Islands', 'MH');
INSERT INTO countries (Name, ISO) VALUES ('Martinique', 'MQ');
INSERT INTO countries (Name, ISO) VALUES ('Mauritania', 'MR');
INSERT INTO countries (Name, ISO) VALUES ('Mauritius', 'MU');
INSERT INTO countries (Name, ISO) VALUES ('Mayotte', 'YT');
INSERT INTO countries (Name, ISO) VALUES ('Mexico', 'MX');
INSERT INTO countries (Name, ISO) VALUES ('Monaco', 'MC');
INSERT INTO countries (Name, ISO) VALUES ('Mongolia', 'MN');
INSERT INTO countries (Name, ISO) VALUES ('Montenegro', 'ME');
INSERT INTO countries (Name, ISO) VALUES ('Montserrat', 'MS');
INSERT INTO countries (Name, ISO) VALUES ('Morocco', 'MA');
INSERT INTO countries (Name, ISO) VALUES ('Mozambique', 'MZ');
INSERT INTO countries (Name, ISO) VALUES ('Myanmar', 'MM');
INSERT INTO countries (Name, ISO) VALUES ('Namibia', 'NA');
INSERT INTO countries (Name, ISO) VALUES ('Nauru', 'NR');
INSERT INTO countries (Name, ISO) VALUES ('Nepal', 'NP');
INSERT INTO countries (Name, ISO) VALUES ('Netherlands', 'NL');
INSERT INTO countries (Name, ISO) VALUES ('New Caledonia', 'NC');
INSERT INTO countries (Name, ISO) VALUES ('New Zealand', 'NZ');
INSERT INTO countries (Name, ISO) VALUES ('Nicaragua', 'NI');
INSERT INTO countries (Name, ISO) VALUES ('Niger', 'NE');
INSERT INTO countries (Name, ISO) VALUES ('Nigeria', 'NG');
INSERT INTO countries (Name, ISO) VALUES ('Niue', 'NU');
INSERT INTO countries (Name, ISO) VALUES ('Norfolk Island', 'NF');
INSERT INTO countries (Name, ISO) VALUES ('Northern Mariana Islands', 'MP');
INSERT INTO countries (Name, ISO) VALUES ('Norway', 'NO');
INSERT INTO countries (Name, ISO) VALUES ('Oman', 'OM');
INSERT INTO countries (Name, ISO) VALUES ('Pakistan', 'PK');
INSERT INTO countries (Name, ISO) VALUES ('Palau', 'PW');
INSERT INTO countries (Name, ISO) VALUES ('Panama', 'PA');
INSERT INTO countries (Name, ISO) VALUES ('Papua New Guinea', 'PG');
INSERT INTO countries (Name, ISO) VALUES ('Paraguay', 'PY');
INSERT INTO countries (Name, ISO) VALUES ('Peru', 'PE');
INSERT INTO countries (Name, ISO) VALUES ('Philippines', 'PH');
INSERT INTO countries (Name, ISO) VALUES ('Pitcairn', 'PN');
INSERT INTO countries (Name, ISO) VALUES ('Poland', 'PL');
INSERT INTO countries (Name, ISO) VALUES ('Portugal', 'PT');
INSERT INTO countries (Name, ISO) VALUES ('Puerto Rico', 'PR');
INSERT INTO countries (Name, ISO) VALUES ('Qatar', 'QA');
INSERT INTO countries (Name, ISO) VALUES ('Romania', 'RO');
INSERT INTO countries (Name, ISO) VALUES ('Russian Federation', 'RU');
INSERT INTO countries (Name, ISO) VALUES ('Rwanda', 'RW');
INSERT INTO countries (Name, ISO) VALUES ('Saint Kitts and Nevis', 'KN');
INSERT INTO countries (Name, ISO) VALUES ('Saint Lucia', 'LC');
INSERT INTO countries (Name, ISO) VALUES ('Saint Martin (French part)' ,'MF');
INSERT INTO countries (Name, ISO) VALUES ('Saint Pierre and Miquelon', 'PM');
INSERT INTO countries (Name, ISO) VALUES ('Saint Vincent and the Grenadines', 'VC');
INSERT INTO countries (Name, ISO) VALUES ('Samoa', 'WS');
INSERT INTO countries (Name, ISO) VALUES ('San Marino', 'SM');
INSERT INTO countries (Name, ISO) VALUES ('Sao Tome and Principe', 'ST');
INSERT INTO countries (Name, ISO) VALUES ('Saudi Arabia', 'SA');
INSERT INTO countries (Name, ISO) VALUES ('Senegal', 'SN');
INSERT INTO countries (Name, ISO) VALUES ('Serbia', 'RS');
INSERT INTO countries (Name, ISO) VALUES ('Seychelles', 'SC');
INSERT INTO countries (Name, ISO) VALUES ('Sierra Leone', 'SL');
INSERT INTO countries (Name, ISO) VALUES ('Singapore', 'SG');
INSERT INTO countries (Name, ISO) VALUES ('Sint Maarten (Dutch part)' ,'SX');
INSERT INTO countries (Name, ISO) VALUES ('Slovakia', 'SK');
INSERT INTO countries (Name, ISO) VALUES ('Slovenia', 'SI');
INSERT INTO countries (Name, ISO) VALUES ('Solomon Islands', 'SB');
INSERT INTO countries (Name, ISO) VALUES ('Somalia', 'SO');
INSERT INTO countries (Name, ISO) VALUES ('South Africa', 'ZA');
INSERT INTO countries (Name, ISO) VALUES ('South Georgia and the South Sandwich Islands', 'GS');
INSERT INTO countries (Name, ISO) VALUES ('South Sudan', 'SS');
INSERT INTO countries (Name, ISO) VALUES ('Spain', 'ES');
INSERT INTO countries (Name, ISO) VALUES ('Sri Lanka', 'LK');
INSERT INTO countries (Name, ISO) VALUES ('State of Palestine', 'PS');
INSERT INTO countries (Name, ISO) VALUES ('Sudan', 'SD');
INSERT INTO countries (Name, ISO) VALUES ('Suriname', 'SR');
INSERT INTO countries (Name, ISO) VALUES ('Svalbard and Jan Mayen', 'SJ');
INSERT INTO countries (Name, ISO) VALUES ('Swaziland', 'SZ');
INSERT INTO countries (Name, ISO) VALUES ('Sweden', 'SE');
INSERT INTO countries (Name, ISO) VALUES ('Switzerland', 'CH');
INSERT INTO countries (Name, ISO) VALUES ('Syrian Arab Republic', 'SY');
INSERT INTO countries (Name, ISO) VALUES ('Tajikistan', 'TJ');
INSERT INTO countries (Name, ISO) VALUES ('Thailand', 'TH');
INSERT INTO countries (Name, ISO) VALUES ('Timor-Leste', 'TL');
INSERT INTO countries (Name, ISO) VALUES ('Togo', 'TG');
INSERT INTO countries (Name, ISO) VALUES ('Tokelau', 'TK');
INSERT INTO countries (Name, ISO) VALUES ('Tonga', 'TO');
INSERT INTO countries (Name, ISO) VALUES ('Trinidad and Tobago', 'TT');
INSERT INTO countries (Name, ISO) VALUES ('Tunisia', 'TN');
INSERT INTO countries (Name, ISO) VALUES ('Turkey', 'TR');
INSERT INTO countries (Name, ISO) VALUES ('Turkmenistan', 'TM');
INSERT INTO countries (Name, ISO) VALUES ('Turks and Caicos Islands', 'TC');
INSERT INTO countries (Name, ISO) VALUES ('Tuvalu', 'TV');
INSERT INTO countries (Name, ISO) VALUES ('Uganda', 'UG');
INSERT INTO countries (Name, ISO) VALUES ('Ukraine', 'UA');
INSERT INTO countries (Name, ISO) VALUES ('United Arab Emirates', 'AE');
INSERT INTO countries (Name, ISO) VALUES ('United Kingdom', 'GB');
INSERT INTO countries (Name, ISO) VALUES ('United States', 'US');
INSERT INTO countries (Name, ISO) VALUES ('United States Minor Outlying Islands', 'UM');
INSERT INTO countries (Name, ISO) VALUES ('Uruguay', 'UY');
INSERT INTO countries (Name, ISO) VALUES ('Uzbekistan', 'UZ');
INSERT INTO countries (Name, ISO) VALUES ('Vanuatu', 'VU');
INSERT INTO countries (Name, ISO) VALUES ('Viet Nam', 'VN');
INSERT INTO countries (Name, ISO) VALUES ('Wallis and Futuna', 'WF');
INSERT INTO countries (Name, ISO) VALUES ('Western Sahara', 'EH');
INSERT INTO countries (Name, ISO) VALUES ('Yemen', 'YE');
INSERT INTO countries (Name, ISO) VALUES ('Zambia', 'ZM');
INSERT INTO countries (Name, ISO) VALUES ('Zimbabwe', 'ZW');