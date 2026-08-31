/* eslint-disable import/no-unresolved */
import expect from 'expect';
import { userCanWriteInCollection } from 'src/utilities/collectionUtilities';
import { PermissionConst } from 'src/utilities/PermissionConst';

// P1 WP 04 (REQ-ELN-19): read-only affordance for guests — a missing
// permission_level means "own collection" for locals but never for guests.
describe('userCanWriteInCollection', () => {
  const guest = { external: true };
  const local = { external: false };
  const sharedAt = (level) => ({ collection_share_id: 42, permission_level: level });

  it('lets a local user write in an own collection (no permission_level)', () => {
    expect(userCanWriteInCollection({ id: 1 }, local)).toBe(true);
  });

  it('never treats a level-less collection as writable for a guest', () => {
    expect(userCanWriteInCollection({ id: 1 }, guest)).toBe(false);
  });

  it('denies a read-only guest (level 0)', () => {
    expect(userCanWriteInCollection(sharedAt(PermissionConst.ReadElements), guest)).toBe(false);
  });

  it('allows an escalated guest at the requested level', () => {
    expect(userCanWriteInCollection(sharedAt(PermissionConst.EditElements), guest)).toBe(true);
  });

  it('respects a higher requested level', () => {
    expect(
      userCanWriteInCollection(sharedAt(PermissionConst.EditElements), guest, PermissionConst.AddElements)
    ).toBe(false);
  });

  it('denies with no collection at all', () => {
    expect(userCanWriteInCollection(null, guest)).toBe(false);
  });
});
