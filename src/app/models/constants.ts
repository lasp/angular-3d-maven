export const MAVEN_CONSTANTS = {
    ORBIT_ALTITUDE: 'spice_spacecraft_altitude_w_r_t_ellipsoid',
    ORBIT_LAT: 'spice_spacecraft_geo_latitude',
    ORBIT_LONG: 'spice_spacecraft_geo_longitude',
    SOLAR_LONG: 'spice_mars_season_ls',
    SOLAR_ZENITH_ANG: 'spice_spacecraft_solar_zenith_angle',
    SUN_DISTANCE: 'spice_mars_sun_distance',
    SUBSOLAR_LAT: 'spice_subsolar_point_geo_latitude',
    SUBSOLAR_LONG: 'spice_subsolar_point_geo_longitude',
    IAU_TO_MSO_MATRIX: 'spice_rotation_matrix_iau_mars_maven_mso',
    MARSIAU2000: new Cesium.Ellipsoid(3396000.0, 3396000.0, 3396000.0),
    ORBIT_COLOR_PARAMETERS: [
        {
            id: 'ngims_ar_density',
            name: 'Ar Density',
            desc: 'cm^3'
        },
        {
            id: 'ngims_co2_density',
            name: 'CO2 Density',
            desc: 'cm^3'
        },
        {
            id: 'ngims_co_density',
            name: 'CO Density',
            desc: 'cm^3'
        },
        {
            id: 'ngims_he_density',
            name: 'He Density',
            desc: 'cm^3'
        }
    ],
    ORBIT_WHISKER_PARAMETERS: [
        {
            id: 'mag_magnetic_field_mso',
            name: 'Magnetic Field',
            desc: 'nT',
            dataset: 'in_situ_kp_mag'
        },
        {
            id: 'swia_hplus_flow_velocity_mso',
            name: 'SWIA H+ Flow Velocity',
            desc: 'km / s',
            dataset: 'in_situ_kp_swia'
        },
        {
            id: 'static_o2plus_flow_velocity_mso',
            name: 'STATIC O2+ Flow Velocity',
            desc: 'km / s',
            dataset: 'in_situ_kp_static'
        },
        {
            id: 'static_hplus_characteristic_direction_mso',
            name: 'STATIC H+ Characteristic Direction',
            desc: 'unit vector',
            dataset: 'in_situ_kp_static'
        },
        {
            id: 'static_dominant_pickup_ion_characteristic_direction_mso',
            name: 'STATIC Dominant Pickup Ion Characteristic Direction',
            desc: 'unit vector',
            dataset: 'in_situ_kp_static'
        }
    ]
};

export const imageryViewModels = [
    new Cesium.ProviderViewModel({
        name: 'Viking',
        iconUrl: Cesium.buildModuleUrl( '/assets/images/VikingThumb.png' ),
        tooltip: 'Viking true-ish color (http://www.mars.asu.edu/data/mdim_color/)',
        creationFunction: () => {
            return new Cesium.TileMapServiceImageryProvider({
                url: 'https://lasp.colorado.edu/media/projects/tms_trees/mars-viking',
                minimumLevel: 0,
                maximumLevel: 5,
                fileExtension: 'png',
                flipXY: true
            });
        }
    }),
    new Cesium.ProviderViewModel({
        name: 'MOLA',
        iconUrl: Cesium.buildModuleUrl( '/assets/images/MolaThumb.png' ),
        tooltip: 'MOLA Color Height Map (http://www.mars.asu.edu/data/mdim_color/)',
        creationFunction: () => {
            return new Cesium.TileMapServiceImageryProvider({
                url: 'https://lasp.colorado.edu/media/projects/tms_trees/mars-mola',
                maximumLevel: 7,
                ellipsoid: MAVEN_CONSTANTS.MARSIAU2000,
                flipXY: true
            });
        }
    }),
    new Cesium.ProviderViewModel({
        name: 'MOLA-SR',
        iconUrl: Cesium.buildModuleUrl( '/assets/images/MolaSrThumb.png' ),
        tooltip: 'MOLA Shaded Relief Map (http://www.mars.asu.edu/data/molasr/)',
        creationFunction: () => {
            return new Cesium.TileMapServiceImageryProvider({
                url: 'https://lasp.colorado.edu/media/projects/tms_trees/mars-mola-sr',
                maximumLevel: 5,
                ellipsoid: MAVEN_CONSTANTS.MARSIAU2000,
                flipXY: true
            });
        }
    })
];

export const terrainViewModels = [
    new Cesium.ProviderViewModel({
        name: 'MARSIAU2000',
        tooltip: 'Mars IAU 2000',
        iconUrl: '/assets/images/Ellipsoid.png',
        creationFunction: () => {
            return new Cesium.EllipsoidTerrainProvider({ ellipsoid: MAVEN_CONSTANTS.MARSIAU2000 });
        }
    })
];

export const colormaps = [
    {
        name: 'Blue-Red',
        colormap: 'bluered',
        source: './assets/images/bluered.png'
    },
    {
        name: 'Cool',
        colormap: 'cool',
        source: './assets/images/cool.png'
    },
    {
        name: 'Inferno',
        colormap: 'inferno',
        source: './assets/images/inferno.png'
    },
    {
        name: 'Plasma',
        colormap: 'plasma',
        source: './assets/images/plasma.png'
    },
    {
        name: 'Spring',
        colormap: 'spring',
        source: './assets/images/spring.png'
    },
    {
        name: 'Viridis',
        colormap: 'viridis',
        source: './assets/images/viridis.png'
    }
];

/**
 * getKpMatrix3Params()
 * Function for matrix parameters with "[row]_[col]"" tails on their index name
 * Matrix's are 3x3, so we add "1_1", "1_2", ... , "3_3".
 */
export const getKpMatrix3Params = ( dataset ) => {
    const result = [];
    for ( let row = 1; row < 4; row++ ) {
        for ( let col = 1; col < 4; col++ ) {
            result.push( [ dataset, row, col ].join( '_' ) );
        }
    }
    return result;
};

export const MGITM_CONSTANTS = {
    PARAMETERS: [
        {
            id: 'o2plus',
            name: 'O2+'
        },
        {
            id: 'oplus',
            name: 'O+'
        },
        {
            id: 'co2plus',
            name: 'CO2+'
        },
        {
            id: 'n_e',
            name: 'N_E'
        },
        {
            id: 'co2',
            name: 'CO2'
        },
        {
            id: 'co',
            name: 'CO'
        },
        {
            id: 'n2',
            name: 'N2'
        },
        {
            id: 'o2',
            name: 'O2'
        },
        {
            id: 'o',
            name: 'O'
        },
        {
            id: 'Zonal_vel',
            name: 'Zonal Velocity'
        },
        {
            id: 'Merid_vel',
            name: 'Meridian Velocity'
        },
        {
            id: 'Vert_vel',
            name: 'Vertical Velocity'
        },
        {
            id: 'Temp_tn',
            name: 'Temp_tn'
        },
        {
            id: 'Temp_ti',
            name: 'Temp_ti'
        },
        {
            id: 'Temp_te',
            name: 'Temp_te'
        }
    ],
    SOLAR_FLUXES: [
        '70',
        '130',
        '200'
    ]
};
