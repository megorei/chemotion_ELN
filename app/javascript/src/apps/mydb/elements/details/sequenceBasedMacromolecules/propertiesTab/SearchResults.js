import React, { useContext, useState } from 'react';
import { Card, Button, Collapse, Modal, } from 'react-bootstrap';
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

  const renderChooseLink = (node) => {
    return (
      <div>
        {node.data.uniprot_number}
        <Button variant="link">Choose</Button>
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
              Your search for:
              <br />
              {`${sequenceBasedMacromolecule.sbmm_search_by}: ${sequenceBasedMacromolecule.sbmm_search_input}`}
            </div>

            <div className="mb-4">
              <b>109 Results</b>
            </div>

            <div className="mb-4">
              {
                dummyResult.map((result, i) => (
                  <Card className="mb-3" key={`result-card-${i}`}>
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center gap-2">
                        <div>
                          {
                            `${result.uniprot_number} - ${result.name} - ${result.systematic_name} (${result.short_name})`
                          }
                        </div>
                        <Button variant="primary" size="sm">Choose</Button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {`Organism: ${result.organism} - EC: ${result.ec_number} - Strain: ${result.strain} - Tissue: ${result.tissue}`}
                    </Card.Body>
                  </Card>
                ))
              }
            </div>

            <div className="ag-theme-alpine w-100 my-5">
              <AgGridReact
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowData={dummyResult || []}
                rowHeight="auto"
                domLayout="autoHeight"
                autoSizeStrategy={{ type: 'fitGridWidth' }}
              />
            </div>

            <div className="mb-4 border border-gray-500">
              {
                dummyResult.map((result, i) => (
                  <div className={`${i % 2 == 0 ? 'bg-white' : 'bg-light'} ${i === dummyResult.length - 1 ? 'border-bottom-0' : 'border-bottom'} p-0`}>
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <div className="d-flex justify-content-between align-items-center gap-2 w-100">
                        <div
                          className="border-0 p-2 w-100 text-start"
                          onClick={() => sequenceBasedMacromoleculeStore.toggleContent(`search-result-collapse-${i}`)}
                        >
                          {
                            `${result.uniprot_number} - ${result.name} - ${result.systematic_name} (${result.short_name})`
                          }
                        </div>
                        <Button variant="primary" size="sm" className="my-2">Choose</Button>
                      </div>
                      <i
                        className={`p-2 fa fa-angle-${sequenceBasedMacromoleculeStore.toggable_contents[`search-result-collapse-${i}`] ? 'up' : 'down'} fs-4`}
                        onClick={() => sequenceBasedMacromoleculeStore.toggleContent(`search-result-collapse-${i}`)}
                      />
                    </div>

                    <Collapse in={sequenceBasedMacromoleculeStore.toggable_contents[`search-result-collapse-${i}`]}>
                      <div className="bg-white border-top p-2 m-0">
                        {
                          `Organism: ${result.organism} - EC: ${result.ec_number} - 
                      Strain: ${result.strain} - Tissue: ${result.tissue}`
                        }
                      </div>
                    </Collapse>
                  </div>
                ))
              }
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
}

export default SearchResults;
