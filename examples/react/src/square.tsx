import React from 'react';

const Square = React.memo<{ onClick: () => void; value: string }>(
  ({ value, onClick }) => {
    return (
      <button className="square" onClick={onClick}>
        {value}
      </button>
    );
  }
);

export default Square;
