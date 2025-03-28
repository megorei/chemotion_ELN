import ReactionFactory from 'factories/ReactionFactory';
import expect from 'expect';

describe('Reaction', async () => {
  const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  describe('Reaction.updateMaxAmountOfProducts()', () => {
    context('when no referenceStartingMaterial is available', () => {
      it('no change of product maxAmounts', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBe(undefined);
        expect(reaction.products[1].maxAmount).toBe(undefined);
      });
    });

    context('when first starting material is reference', () => {
      it('correct max amounts calculated (40,80)', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(40, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(80, 5);
      });
    });
    context('when second starting material is reference', () => {
      it('correct max amounts calculated (200,400)', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = true;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(200, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(400, 5);
      });
    });

    context('when no product present', () => {
      it('no changes happened', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;
        const { products } = reaction;
        reaction.products = [];
        reaction.updateMaxAmountOfProducts();

        reaction.products = products;
      });
    });
  });
  describe('Reaction.buildCopy()', () => {
    it('should copy starting materials with _real_amount_value set to null', () => {
      const copy = reaction.buildCopy({ collection_id: 'newCollectionId' });
      expect(copy.starting_materials[0]._real_amount_value).toBe(null);
      expect(copy.starting_materials[1]._real_amount_value).toBe(null);
    });

    it('should handle empty starting_materials', () => {
      reaction.starting_materials = [];
      const copy = reaction.buildCopy({ collection_id: 'newCollectionId' });
      expect(copy.starting_materials).toEqual([]);
    });
  });
});

