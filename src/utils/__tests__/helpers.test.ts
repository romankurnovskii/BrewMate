import { transformArrayToDict } from '../helpers';

describe('transformArrayToDict', () => {
  test('should transform array to dictionary', () => {
    const arr = [
      { id: '1', name: 'App 1' },
      { id: '2', name: 'App 2' },
      { id: '3', name: 'App 3' },
    ];
    const keyName = 'id';
    const expectedDict = {
      1: { id: '1', name: 'App 1' },
      2: { id: '2', name: 'App 2' },
      3: { id: '3', name: 'App 3' },
    };
    expect(transformArrayToDict(arr, keyName)).toEqual(expectedDict);
  });
});
