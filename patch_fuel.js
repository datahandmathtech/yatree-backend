const fs = require('fs');

const path = 'e:\\New folder\\TEXI\\yatree-backend\\client\\src\\pages\\Fuel.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add to formData state in useEffect and resetForm
content = content.replace(/paymentSource: 'Office',/g, "paymentSource: 'Office',\n            paymentBy: '',");
content = content.replace(/paymentSource: entry\.paymentSource \|\| 'Office',/g, "paymentSource: entry.paymentSource || 'Office',\n            paymentBy: entry.paymentBy || '',");

// 2. Filter logic
content = content.replace(/e\.driver\?\.toLowerCase\(\)\?\.includes\(searchTerm\.toLowerCase\(\)\)\);/g, "e.driver?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||\n            e.paymentBy?.toLowerCase()?.includes(searchTerm.toLowerCase()));");

// 3. Export Excel
content = content.replace(/'Payment Source': e\.paymentSource \|\| 'Office',/g, "'Payment Source': e.paymentSource || 'Office',\n            'Payment By': e.paymentBy || 'N/A',");

// 4. Table render
const tableSourceFind = `                                                {e.paymentSource?.toLowerCase().includes('guest') ? 'Guest' : 'Office'}
                                            </div>`;
const tableSourceReplace = `                                                {e.paymentSource?.toLowerCase().includes('guest') ? 'Guest' : 'Office'}
                                            </div>
                                            {e.paymentBy && (
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontWeight: '800' }}>
                                                    {e.paymentBy}
                                                </div>
                                            )}`;
content = content.replace(tableSourceFind, tableSourceReplace);

// 5. Create/Edit form
const createFormFind = `                                                <option value="Guest" style={{ background: '#0f172a' }}>Guest</option>
                                            </select>
                                        </div>`;
const createFormReplace = `                                                <option value="Guest" style={{ background: '#0f172a' }}>Guest</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{formData.paymentSource === 'Office' ? 'Office Payer Name' : 'Guest Name'}</label>
                                            <input type="text" className="input-field" placeholder="Enter Name" value={formData.paymentBy} onChange={(e) => setFormData({ ...formData, paymentBy: e.target.value })} style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', padding: '0 15px' }} />
                                        </div>`;
content = content.replace(createFormFind, createFormReplace);

// 6. Approval Modal
const approvalFormFind = `                                        <option value="Guest" style={{ background: '#1e293b' }}>Guest</option>
                                    </select>`;
const approvalFormReplace = `                                        <option value="Guest" style={{ background: '#1e293b' }}>Guest</option>
                                    </select>
                                    
                                    <label style={{ color: 'white', fontSize: '12px', marginBottom: '8px', display: 'block' }}>{formData.paymentSource === 'Office' ? 'Office Payer Name' : 'Guest Name'}</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.paymentBy}
                                        placeholder="Enter Name"
                                        onChange={(e) => setFormData({ ...formData, paymentBy: e.target.value })}
                                        style={{ width: '100%', height: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0 10px', marginBottom: '15px' }}
                                    />`;
content = content.replace(approvalFormFind, approvalFormReplace);

// 7. Approve Submit payload
const approveSubmitFind = `paymentSource: formData.paymentSource })}`;
const approveSubmitReplace = `paymentSource: formData.paymentSource, paymentBy: formData.paymentBy })}`;
content = content.replace(approveSubmitFind, approveSubmitReplace);

fs.writeFileSync(path, content, 'utf8');
console.log("Fuel.jsx patched successfully!");
