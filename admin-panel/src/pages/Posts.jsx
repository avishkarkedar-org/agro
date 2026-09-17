import { notify, confirmDialog } from "../utils/notify";
import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await api("/api/admin/posts");
      setPosts(data.posts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((p) =>
    !search ||
    (p.author_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.content || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!await confirmDialog("Delete " + selected.length + " selected posts?")) return;
    try {
      await Promise.all(selected.map((id) =>
        api(`/api/admin/posts/${id}`, { method: "DELETE" })
      ));
      setSelected([]);
      loadPosts();
    } catch (e) { notify(e.message); }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog("Delete this post?")) return;
    try {
      await api(`/api/admin/posts/${id}`, { method: "DELETE" });
      loadPosts();
    } catch (e) {
      notify(e.message);
    }
  };

  if (loading)
    return (
      <div className="loading-center">
        <span className="spinner"></span> Loading posts...
      </div>
    );

  return (
    <div className="page active">
      <div className="page-header">
        <h1 className="page-title">Manage Posts</h1>
        <p className="page-sub">View, search, and delete community posts</p>
      </div>

      <div className="card">
        <div className="card-hd">
          <span className="card-title">Posts ({filteredPosts.length})</span>
          {selected.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={bulkDelete}
              aria-label="Delete selected posts">
              🗑 Delete {selected.length} Selected
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="search-bar mb2">
            <input className="search-input" value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected([]); }}
              placeholder="Search by author or content..."
              aria-label="Search posts" />
          </div>
          {filteredPosts.length === 0 ? (
            <p className="empty-state">No posts found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox"
                      checked={selected.length === filteredPosts.length && filteredPosts.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? filteredPosts.map((p) => p.id) : [])}
                      aria-label="Select all posts" /></th>
                    <th>Author</th>
                    <th>Content</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((p) => (
                    <tr key={p.id}>
                      <td><input type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={"Select post " + p.id} /></td>
                      <td>{p.author_name}</td>
                      <td>{p.content}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
