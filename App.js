import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

export default function App() {
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState(null);
  const [entries, setEntries] = useState([]);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [entryForm, setEntryForm] = useState({ type: 'debit', amount: '', description: '' });

  // Fetch ledgers on mount
  useEffect(() => {
    fetchLedgers();
  }, []);

  // Fetch entries when ledger changes
  useEffect(() => {
    if (selectedLedger) fetchEntries(selectedLedger.id);
    else setEntries([]);
  }, [selectedLedger]);

  async function fetchLedgers() {
    const { data, error } = await supabase.from('ledgers').select('*');
    if (error) console.error(error);
    else setLedgers(data);
  }

  async function fetchEntries(ledger_id) {
    const { data, error } = await supabase.from('entries').select('*').eq('ledger_id', ledger_id).order('created_at', { ascending: false });
    if (error) console.error(error);
    else setEntries(data);
  }

  async function addLedger() {
    if (!newLedgerName.trim()) return alert('Enter ledger name');
    const { data, error } = await supabase.from('ledgers').insert([{ name: newLedgerName }]).select();
    if (error) console.error(error);
    else {
      setLedgers([...ledgers, data[0]]);
      setNewLedgerName('');
    }
  }

  async function deleteLedger(id) {
    if (!window.confirm('Delete this ledger?')) return;
    const { error } = await supabase.from('ledgers').delete().eq('id', id);
    if (error) console.error(error);
    else {
      setLedgers(ledgers.filter(l => l.id !== id));
      if (selectedLedger?.id === id) setSelectedLedger(null);
    }
  }

  async function addEntry() {
    const { type, amount, description } = entryForm;
    if (!amount || isNaN(amount)) return alert('Enter valid amount');
    const { data, error } = await supabase.from('entries').insert([{ ledger_id: selectedLedger.id, type, amount: parseFloat(amount), description }]).select();
    if (error) console.error(error);
    else {
      setEntries([data[0], ...entries]);
      setEntryForm({ type: 'debit', amount: '', description: '' });
    }
  }

  function calculateBalance(entries) {
    return entries.reduce((sum, e) => e.type === 'credit' ? sum + Number(e.amount) : sum - Number(e.amount), 0);
  }

  function exportLedgerToExcel(ledger, entries) {
    const worksheetData = entries.map(e => ({
      Date: new Date(e.created_at).toLocaleString(),
      Type: e.type,
      Amount: e.amount,
      Description: e.description || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, ledger.name);
    XLSX.writeFile(workbook, `${ledger.name}.xlsx`);
  }

  function exportAllLedgersToExcel() {
    const wb = XLSX.utils.book_new();

    ledgers.forEach(ledger => {
      const ledgerEntries = entries.filter(e => e.ledger_id === ledger.id);
      const data = ledgerEntries.map(e => ({
        Date: new Date(e.created_at).toLocaleString(),
        Type: e.type,
        Amount: e.amount,
        Description: e.description || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, ledger.name);
    });

    XLSX.writeFile(wb, `All_Ledgers_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const grandTotal = ledgers.reduce((acc, ledger) => {
    const ledgerEntries = entries.filter(e => e.ledger_id === ledger.id);
    return acc + calculateBalance(ledgerEntries);
  }, 0);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Ledger App</h1>

      <div>
        <h2>Ledgers</h2>
        <input
          value={newLedgerName}
          onChange={e => setNewLedgerName(e.target.value)}
          placeholder="New Ledger Name"
        />
        <button onClick={addLedger}>Add Ledger</button>

        <ul>
          {ledgers.map(l => (
            <li key={l.id} style={{ marginBottom: 6 }}>
              <button onClick={() => setSelectedLedger(l)} style={{ marginRight: 10 }}>
                {l.name}
              </button>
              <button onClick={() => deleteLedger(l.id)} style={{ color: 'red' }}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      {selectedLedger && (
        <div style={{ marginTop: 20 }}>
          <h2>{selectedLedger.name} Entries</h2>

          <div>
            <select
              value={entryForm.type}
              onChange={e => setEntryForm({ ...entryForm, type: e.target.value })}
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
            <input
              type="number"
              value={entryForm.amount}
              onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
              placeholder="Amount"
            />
            <input
              type="text"
              value={entryForm.description}
              onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
              placeholder="Description"
            />
            <button onClick={addEntry}>Add Entry</button>
          </div>

          <table border="1" cellPadding="5" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.created_at).toLocaleString()}</td>
                  <td>{e.type}</td>
                  <td>{e.amount}</td>
                  <td>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Balance: {calculateBalance(entries)}</h3>
          <button onClick={() => exportLedgerToExcel(selectedLedger, entries)}>Export Ledger to Excel</button>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <h2>Dashboard</h2>
        <p>Grand Total Balance of All Ledgers: {grandTotal}</p>
        <button onClick={exportAllLedgersToExcel}>Export All Ledgers to Excel</button>
      </div>
    </div>
  );
}