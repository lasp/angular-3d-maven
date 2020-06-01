/**
 * Replace the 'parameter_3d_name' objects with the names
 * of the 3D datasets housing your data array. This will allow
 * access of your specific chosen data array after assigning
 * the data you recieve from your 3D parameter LaTiS call to
 * the IWhiskerData interface.
 */
export interface IWhiskerData {
    in_situ_kp_mag: {
        data: string[]
    };
    in_situ_kp_static: {
        data: string[]
    };
    in_situ_kp_swia: {
        data: string[]
    };
}
