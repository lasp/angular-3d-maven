/**
 * Change 'mms_ephemeris' to whatever the ephemeris dataset you're using
 * houses your data array in. Usually this is the name of the ephemeris
 * dataset itself.
 */
export interface IInSituData {
    in_situ_kp_spice: {
        data: string[];
    };
    in_situ_kp_data: {
        data: string[];
    };
}
