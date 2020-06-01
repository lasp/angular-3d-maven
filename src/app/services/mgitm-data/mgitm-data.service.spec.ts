import { TestBed } from '@angular/core/testing';

import { MgitmDataService } from './mgitm-data.service';

describe('MgitmDataService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: MgitmDataService = TestBed.get(MgitmDataService);
        expect(service).toBeTruthy();
    });
});
