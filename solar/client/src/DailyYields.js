import React, { useEffect, useState } from "react";

const InverterTable = () => {
  const [inverters, setInverters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/daily-yields")
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
      {inverters.map((inverter) => (
        <div key={inverter.SN} style={{ marginBottom: "20px", border: "1px solid black", padding: "10px" }}>
          <h3>Inverter SN: {inverter.SN}</h3>
          <p><strong>Rated Power:</strong> {inverter.ratedPower !== undefined ? inverter.ratedPower : "N/A"} kWh</p>
          <table border="1">
            <thead>
              <tr>
                <th>Date</th>
                <th>Yield (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {inverter.dailyYields.map((yieldData, index) => (
                <tr key={index}>
                  <td>{new Date(yieldData.date).toLocaleDateString()}</td>
                  <td>{yieldData.yield}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default InverterTable;
