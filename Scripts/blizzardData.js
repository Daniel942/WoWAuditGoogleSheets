/* global connectionSheet, ui, cache, locale */
/* exported onEdit, validateBlizzardData */

const blizzardDataInstance = blizzardData();

function blizzardData() {
    const regions = ['us', 'eu', 'kr', 'tw', 'cn'];
    const realms = [];

    function isClientDataFilled(verbose = false) {
        const blizzardClientIDCell = connectionSheet.getRange('Connection_BlizzardClientID');
        // Missing Client ID
        if (blizzardClientIDCell.isBlank()) {
            if (verbose) {
                ui.alert('Blizzard Client ID is not set!');
            }
            return false;
        }

        const blizzardClientSecretCell = connectionSheet.getRange('Connection_BlizzardClientSecret');
        // Missing Client Secret
        if (blizzardClientSecretCell.isBlank()) {
            if (verbose) {
                ui.alert('Blizzard Client Secret is not set!');
            }
            return false;
        }

        return true;
    }

    function populateRegionDropdown() {
        const regionCell = connectionSheet.getRange('Connection_Region');
        const regionValidation = regionCell.getDataValidation();

        // Dropdown is set
        if (regionValidation != null) {
            return;
        }

        // Populate dropdown
        const newRule = SpreadsheetApp.newDataValidation()
            .requireValueInList(regions)
            .setAllowInvalid(false)
            .build();
        regionCell.setDataValidation(newRule);
    }

    function populateRealmDropdown() {
        const realmCell = connectionSheet.getRange('Connection_Realm');
        const realmValidation = realmCell.getDataValidation();

        // Dropdown is set
        if (realmValidation != null) {
            return;
        }

        // Client data is valid
        if (validate()) {
            const region = connectionSheet.getRange('Connection_Region').getValue();
            const token = _getToken(region);

            const BLIZZARD_REALMS_INDEX_URL = `https://${region}.api.blizzard.com/data/wow/realm/index`;
            const BATTLENET_NAMESPACE = `dynamic-${region}`;

            const response = UrlFetchApp.fetch(BLIZZARD_REALMS_INDEX_URL, {
                'method': 'GET',
                'headers': {
                    'Authorization': `Bearer ${token}`,
                    'Battlenet-Namespace': BATTLENET_NAMESPACE,
                    'Locale': locale
                }
            });

            if (response.getResponseCode() === 200) {
                const realmNames = []
                JSON.parse(response.getContentText()).realms.forEach(function (realm) {
                    realms.push({ 'id': realm.id, 'name': realm.name, 'slug': realm.slug });
                    realmNames.push(realm.name);
                });

                console.log(realms);

                // Populate dropdown
                const newRule = SpreadsheetApp.newDataValidation()
                    .requireValueInList(realmNames)
                    .setAllowInvalid(false)
                    .build();
                realmCell.setDataValidation(newRule);
            }
        }
    }

    function validate(verbose = false) {
        // Check inputs
        if (!isClientDataFilled(true)) {
            return false;
        }
    
        // Check region
        const region = connectionSheet.getRange('Connection_Region').getValue();
        if (!regions.includes(region)) {
            if (verbose) {
                ui.alert(`Region must be one of the following: ${regions.join(', ')}`);
            }
            return false;
        }

        // Validate client data by trying to retrieve OAuth token
        const token = _getToken(region, false, verbose);
        if (!token) {
            return false;
        }

        if (verbose) {
            ui.alert(`Client data is valid.`);
        }

        return true;
    }

    function _getToken(region, allowCached = true, verbose = false) {
        let token = null;

        if (allowCached) {
            token = cache.get('token');
            if (token) {
                return token;
            }
        }
        
        const BLIZZARD_OAUTH_URL = `https://${region}.battle.net/oauth/token`;

        const blizzardClientID = connectionSheet.getRange('Connection_BlizzardClientID').getValue();
        const blizzardClientSecret = connectionSheet.getRange('Connection_BlizzardClientSecret').getValue();

        try {
            const response = UrlFetchApp.fetch(BLIZZARD_OAUTH_URL, {
                'method': 'POST',
                'headers': {
                    'Authorization': `Basic ${Utilities.base64Encode(`${blizzardClientID}:${blizzardClientSecret}`)}`
                },
                'payload': {
                    'grant_type': 'client_credentials'
                }
            });

            // Invalid Client ID or Client Secret (Blizzard API could also be unreachable, but then the whole application will not work anyway)
            if (response.getResponseCode() !== 200) {
                if (verbose) {
                    ui.alert(`Invalid Client ID or Client Secret.`);
                }
                return null;
            }

            token = JSON.parse(response.getContentText()).access_token;
            cache.put('token', token);
            return token;
        }
        catch (e) {
            if (verbose) {
                ui.alert(`Invalid Client ID or Client Secret.`);
            }
            return null;
        }
    }

    return Object.freeze({
        isClientDataFilled,
        populateRegionDropdown,
        populateRealmDropdown,
        validate
    });
}

function onEdit(e) {
    const dataSource = e.range.getDataSourceUrl();

    // Blizzard Client ID or Client Secret field changed in spreadsheet
    if (dataSource === connectionSheet.getRange('Connection_BlizzardClientID').getDataSourceUrl() || dataSource === connectionSheet.getRange('Connection_BlizzardClientSecret').getDataSourceUrl()) {
        if (blizzardDataInstance.isClientDataFilled()) {
            blizzardDataInstance.populateRegionDropdown();
        }
    }
}

function validateBlizzardData() {
    blizzardDataInstance.validate(true);
    blizzardDataInstance.populateRealmDropdown();
}