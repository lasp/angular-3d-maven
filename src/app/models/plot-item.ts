import { IDataset, IRange } from 'scicharts';

export interface IPlotItem {
    datasets: IDataset[];
    id: string;
    range: IRange;
}
