import React, { useContext, useState } from 'react';
import { Button, Modal, } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import Draggable from "react-draggable";

import { StoreContext } from 'src/stores/mobx/RootStore';

const SearchResults = () => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;

  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  const Spinner = () => {
    return (
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
    );
  }

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  const chooseUniprotEntry = (uniprot_number) => {
    const identifier = sequenceBasedMacromolecule.sequence_based_macromolecule.uniprot_derivation === 'uniprot_modified'
      ? 'parent_identifier'
      : 'primary_accession';

    sequenceBasedMacromoleculeStore.changeSequenceBasedMacromolecule(
      `sequence_based_macromolecule.${identifier}`, uniprot_number
    );

    sequenceBasedMacromoleculeStore.closeSearchResult();
  }

  const renderChooseLink = (node) => {
    return (
      <div>
        {node.data.uniprot_number}
        <Button variant="link" onClick={() => chooseUniprotEntry(node.data.uniprot_number)}>
          Choose
        </Button>
      </div>
    );
  }

  const dummyResult = [
    {
      uniprot_number: 'O75783',
      name: 'RHBL1_HUMAN',
      systematic_name: 'Rhomboid-related protein 1',
      short_name: 'RRP',
      organism: 'Homo sapiens (Human)',
      ec_number: '3.4.21.105',
      strain: 'Wistar',
      tissue: 'Leukemia',
    },
    {
      uniprot_number: 'Q9NX52',
      name: 'RHBL2_HUMAN',
      systematic_name: 'Rhomboid-related protein 2',
      short_name: 'RRP2',
      organism: 'Homo sapiens (Human)',
      ec_number: '3.4.21.105',
      strain: 'Wistar',
      tissue: 'Leukemia',
    },
    {
      uniprot_number: 'P12345',
      name: 'RHBL2_HUMAN',
      systematic_name: 'Rhomboid-related protein 2',
      short_name: 'RRP2',
      organism: 'Homo sapiens (Human)',
      ec_number: '3.4.21.105',
      strain: 'Wistar',
      tissue: 'Leukemia',
    },
  ];

  const columnDefs = [
    {
      headerName: "UniProt number",
      field: 'uniprot_number',
      cellRenderer: renderChooseLink,
      minWidth: 150,
      maxWidth: 150,
    },
    {
      headerName: "Name",
      field: "name",
    },
    {
      headerName: "Full name",
      field: 'systematic_name',
    },
    {
      headerName: "Short name",
      field: "short_name",
      minWidth: 100,
      maxWidth: 100,
    },
    {
      headerName: "Organism",
      field: 'organism',
    },
    {
      headerName: "EC-number",
      field: "ec_number",
      minWidth: 100,
      maxWidth: 100,
    },
  ];

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: true,
    resizable: false,
    suppressMovable: true,
    cellClass: ["border-end", "px-2"],
    headerClass: ["border-end", "px-2"],
  };

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={true}
          onHide={() => sequenceBasedMacromoleculeStore.closeSearchResult()}
          backdrop={false}
          keyboard={false}
          className="draggable-modal-dialog-xxxl"
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content"
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" closeButton>
            <Modal.Title className="draggable-modal-stack-title">
              <i className="fa fa-arrows move" />
              Search Results
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-4">
              <b>Your search for:</b>
              <br />
              {`${sequenceBasedMacromolecule.sbmm_search_by}: ${sequenceBasedMacromolecule.sbmm_search_input}`}
            </div>

            <div className="mb-4">
              <b>109 Results</b>
            </div>

            <div className="ag-theme-alpine w-100 mb-4">
              <AgGridReact
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowData={dummyResult || []}
                rowHeight="auto"
                domLayout="autoHeight"
                autoSizeStrategy={{ type: 'fitGridWidth' }}
              />
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
}

export default SearchResults;
