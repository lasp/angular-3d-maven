import { TestBed } from '@angular/core/testing';

import { InSituDataService } from './in-situ-data.service';

describe('InSituDataService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: InSituDataService = TestBed.get(InSituDataService);
        expect(service).toBeTruthy();
    });
});
