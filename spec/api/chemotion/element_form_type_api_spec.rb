# frozen_string_literal: true

describe Chemotion::ElementFormTypeAPI do
  include_context 'api request authorization context'

  let(:new_element_form_type) { create(:element_form_type, :sample_type, creator: user) }
  let(:element_form_type_with_structure) { create(:element_form_type, :sample_type, :default_sample_structure) }

  describe 'GET /api/v1/element_form_types' do
    before do
      new_element_form_type
    end

    context 'without params' do
      it 'fetches all ElementFormTypes' do
        get '/api/v1/element_form_types'

        expect(parsed_json_response['element_form_types'].length).to eq(1)
      end
    end

    context 'with id' do
      it 'fetches an ElementFormType' do
        get "/api/v1/element_form_types/#{new_element_form_type.id}"

        expect(parsed_json_response['name']).to eql(new_element_form_type.name)
      end
    end
  end

  describe 'POST /api/v1/element_form_types' do
    let(:element_form_type_params) do
      {
        name: 'chemical',
        element_type: 'sample',
        enabled: false,
      }
    end

    let(:expected_result) do
      {
        name: 'chemical',
        description: nil,
        element_type: 'sample',
        structure: {},
        enabled: false,
      }.stringify_keys
    end

    it 'creates an element form type' do
      post '/api/v1/element_form_types', params: element_form_type_params

      expect(parsed_json_response).to include(expected_result)
    end
  end

  describe 'PUT /api/v1/element_form_types/:id' do
    context 'when updating an element form type with structure' do
      let(:params) do
        {
          name: 'chemical',
          description: nil,
          element_type: 'sample',
          structure: element_form_type_with_structure.structure,
          enabled: true,
        }
      end

      it 'returns the updated ElementFormType' do
        put "/api/v1/element_form_types/#{new_element_form_type.id}", params: params

        expect(parsed_json_response['structure']).to eql(params[:structure])
      end
    end
  end

  describe 'DELETE /api/v1/element_form_types/:id' do
    context 'when element form type exist' do
      it 'deletes the element form type' do
        delete "/api/v1/element_form_types/#{new_element_form_type.id}"

        expect(parsed_json_response).to include('deleted' => new_element_form_type.id)
      end
    end
  end
end
