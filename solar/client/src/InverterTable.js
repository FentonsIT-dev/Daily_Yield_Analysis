import React, { useEffect, useState } from "react";

const InverterTable = () => {
  const [inverters, setInverters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/inverters")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data) => {
        setInverters(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h2>Inverter Data</h2>
      <table border="1">
        <thead>
          <tr>
            <th>SN</th>
            <th>Type</th>
            <th>Site Name</th>
            <th>Customer Name</th>
            <th>Rated Power (kWh)</th>
            <th>Installer</th>
            <th>Inverter SN</th>
            <th>Total Yield (kWh)</th>
            <th>Country</th>
          </tr>
        </thead>
        <tbody>
          {inverters.map((inverter) => (
            <tr key={inverter._id}>
              <td>{inverter.SN}</td>
              <td>{inverter.type}</td>
              <td>{inverter.siteName}</td>
              <td>{inverter.customerName}</td>
              <td>{inverter.ratedPower}</td>
              <td>{inverter.installer}</td>
              <td>{inverter.inverterSN}</td>
              <td>{inverter.totalYield}</td>
              <td>{inverter.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InverterTable;
