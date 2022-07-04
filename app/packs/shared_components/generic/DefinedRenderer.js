// imports from node_modules
import React from 'react';

// imports from other namespaces

// imports from own namespace
import AttrChk from '/app/packs/shared_components/generic/AttrChk';
import SystemSelect from '/app/packs/shared_components/generic/SystemSelect';
import { molOptions, samOptions } from '/app/packs/shared_components/generic/Utils';

const DefinedRenderer = (props) => {
  const {
    unitConfig, node, selDefined, chkAttr
  } = props;
  if (node.data.type === 'system-defined') return <SystemSelect unitConfig={unitConfig} selDefined={selDefined} node={node} />;
  if (node.data.type === 'drag_molecule') return <AttrChk chkAttr={chkAttr} node={node} attrOpts={molOptions} />;
  if (node.data.type === 'drag_sample') return <AttrChk chkAttr={chkAttr} node={node} attrOpts={samOptions} />;
  return node.data.value || null;
};

export default DefinedRenderer;
