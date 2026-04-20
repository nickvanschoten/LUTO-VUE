export const VRE_INFRASTRUCTURE_LIST = [
    'onshore wind',
    'utility solar pv'
];

export const EXCLUDED_MAP_REGIONS = [
    'australia',
    'new south wales',
    'victoria',
    'queensland',
    'south australia',
    'western australia',
    'tasmania',
    'northern territory',
    'australian capital territory',
    'other territories'
];

export const NRM_TO_STATE_MAP: Record<string, string> = {
    // NSW
    'central tablelands': 'new south wales',
    'central west': 'new south wales',
    'greater sydney': 'new south wales',
    'hunter': 'new south wales',
    'murray': 'new south wales',
    'murrumbidgee': 'new south wales',
    'north coast': 'new south wales',
    'north west': 'new south wales',
    'northern tablelands': 'new south wales',
    'riverina': 'new south wales',
    'western': 'new south wales',
    'hawkesbury-nepean': 'new south wales',
    'lower murray darling': 'new south wales',
    'sydney metro': 'new south wales',
    // VIC
    'corangamite': 'victoria',
    'east gippsland': 'victoria',
    'glenelg hopkins': 'victoria',
    'goulburn broken': 'victoria',
    'mallee': 'victoria',
    'north central': 'victoria',
    'north east': 'victoria',
    'port phillip and westernport': 'victoria',
    'west gippsland': 'victoria',
    'wimmera': 'victoria',
    // QLD
    'burnett mary': 'queensland',
    'cape york': 'queensland',
    'condamine': 'queensland',
    'cooperative management area': 'queensland',
    'desert channels': 'queensland',
    'fitzroy': 'queensland',
    'mackay whitsunday': 'queensland',
    'maranoa balonne and border rivers': 'queensland',
    'northern gulf': 'queensland',
    'south west queensland': 'queensland',
    'southern gulf': 'queensland',
    'terrain': 'queensland',
    'wet tropics': 'queensland',
    // WA
    'avon river basin': 'western australia',
    'northern agricultural region': 'western australia',
    'peel-harvey': 'western australia',
    'rangelands': 'western australia',
    'south coast': 'western australia',
    'south west': 'western australia',
    // SA
    'adelaide and mount lofty ranges': 'south australia',
    'alinytjara wilurara': 'south australia',
    'eyre peninsula': 'south australia',
    'kangaroo island': 'south australia',
    'northern and yorke': 'south australia',
    'sa arid lands': 'south australia',
    'sa murray darling basin': 'south australia',
    'south east': 'south australia',
    // TAS
    'cradle coast': 'tasmania',
    'nrm north': 'tasmania',
    'nrm south': 'tasmania',
    // NT
    'northern territory': 'northern territory',
    // ACT
    'act': 'australian capital territory'
};
