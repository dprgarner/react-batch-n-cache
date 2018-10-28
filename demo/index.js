import React from 'react';
import ReactDOM from 'react-dom';

import Demo from './Demo';
import './styles.css';

const root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

ReactDOM.render(<Demo />, root);
