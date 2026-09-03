# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Public::HealthCheck do
  describe '.database_ready?' do
    context 'when the database answers SELECT 1' do
      it 'returns true' do
        expect(described_class.database_ready?).to be true
      end
    end

    context 'when no database connection can be established' do
      before do
        allow(ActiveRecord::Base).to receive(:connection)
          .and_raise(ActiveRecord::ConnectionNotEstablished)
      end

      it 'returns false' do
        expect(described_class.database_ready?).to be false
      end
    end

    context 'when the database query fails' do
      before do
        allow(ActiveRecord::Base).to receive(:connection)
          .and_raise(ActiveRecord::StatementInvalid)
      end

      it 'returns false' do
        expect(described_class.database_ready?).to be false
      end
    end
  end
end
