import React, { useEffect, useState } from "react";
import "./ErrorInverters.css"; // Import CSS for styling
import * as XLSX from "xlsx";

const ErrorInverters = () => {
  const [faultInverters, setFaultInverters] = useState([]);
  const [filteredInverters, setFilteredInverters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState("last-month");

  useEffect(() => {
    fetchFaultInverters(selectedRange); // Call fetch with the selected range
  }, [selectedRange]);

  const fetchFaultInverters = (range) => {
    setLoading(true);
    fetch(`http://localhost:3020/fault-inverters?range=${range}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((data) => {
        setFaultInverters(data);
        setFilteredInverters(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  };

  const handleSearch = (event) => {
    if (event.key === "Enter") {
      const value = searchTerm.trim().toLowerCase();
      if (value === "") {
        setFilteredInverters(faultInverters);
      } else {
        setFilteredInverters(
          faultInverters.filter((inverter) =>
            inverter.SN.toLowerCase().includes(value)
          )
        );
      }
    }
  };

  const handleRangeChange = (event) => {
    const range = event.target.value;
    setSelectedRange(range); // Set the selected range, triggering fetch
  };

  const getFilteredYields = (dailyYields) => {
    const filteredYields = [];
    const recordsToShow =
      selectedRange === "last-week"
        ? 7
        : selectedRange === "last-2-weeks"
        ? 14
        : selectedRange === "last-3-weeks"
        ? 21
        : 30; // Last 30 yields for "Last 30 Days"

    // Slice the last N yields based on the selected range
    for (let i = Math.max(dailyYields.length - recordsToShow, 0); i < dailyYields.length; i++) {
      filteredYields.push(dailyYields[i]);
    }

    return filteredYields;
  };

  const isLowYield = (inverter, yieldData) => {
    // Check if yield is part of any low yield period within the filtered data
    return inverter.lowYieldPeriods.some((period) =>
      period.some(
        (day) =>
          new Date(day.date).toDateString() === new Date(yieldData.date).toDateString()
      )
    );
  };

  const downloadExcel = () => {
    const worksheetData = filteredInverters.map((inverter) => {
      const row = {
        "Inverter SN": inverter.SN,
        "Rated Power (kWh)": inverter.ratedPower,
      };

      getFilteredYields(inverter.dailyYields).forEach((yieldData) => {
        const dateKey = new Date(yieldData.date).toLocaleDateString();
        row[dateKey] = yieldData.yield.toFixed(1);
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fault Inverters");
    XLSX.writeFile(workbook, "Fault_Inverters.xlsx");
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="error-inverters-container">
      <h2>Fault Inverters</h2>
      <input
        type="text"
        placeholder="Search by exact Inverter SN"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleSearch} // Only filters when Enter is pressed
        className="search-bar styled-input"
      />
      <select onChange={handleRangeChange} className="styled-dropdown">
        <option value="last-month">Last 30 Days</option>
        <option value="last-3-weeks">Last 3 Weeks</option>
        <option value="last-2-weeks">Last 2 Weeks</option>
        <option value="last-week">Last Week</option>
      </select>
      <button onClick={downloadExcel} className="download-button styled-button">
        Download Excel
      </button>
      {filteredInverters.length === 0 ? (
        <p>No fault inverters found.</p>
      ) : (
        filteredInverters.map((inverter) => (
          <div key={inverter.SN} className="inverter-card">
            <h3 className="inverter-info">SN: {inverter.SN}</h3>
            <p className="inverter-info"><strong>Rated Power:</strong> {inverter.ratedPower} kWh</p>

            <div className="grid-container">
              {getFilteredYields(inverter.dailyYields).map((yieldData, index) => {
                const isLow = isLowYield(inverter, yieldData); // Check if yield is part of low yield period
                return (
                  <div
                    key={index}
                    className={`grid-item ${isLow ? "fault-inverter" : "normal-inverter"}`}
                  >
                    <span>{new Date(yieldData.date).getDate()}</span>
                    <span>{yieldData.yield.toFixed(1)} kWh</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ErrorInverters;
