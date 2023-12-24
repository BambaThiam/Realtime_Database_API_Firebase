import { ref, off, query, limitToLast, get } from '@firebase/database'
import { collections } from '../firebase/constants'
import { db } from '../firebase/init_Firebase'
import { Fragment, useEffect, useState } from 'react'
import moment from 'moment/moment'
import {
  updateItem,
  removeItem,
  createItem,
} from '../firebase/firebase.service'
import Pagination from './pagination'
import { itemModel } from '../firebase/models'

// import { off } from 'process'

const RealtimeAPI = () => {
  const itemsRef = ref(db, collections.items)
  // console.log(itemsRef)

  // State hook for managing data loading status
  const [loading, setLoading] = useState(false)
  // State hook for storing fetched items
  const [items, setItems] = useState([])
  // State hook for managing the currently selected item (for edit operations)
  const [selectedItem, setSelectedItem] = useState(null)
  // State hook for storing the current page number for pagination
  const [currentPage, setCurrentPage] = useState(1)
  // State hook for setting items per page for pagination
  const [itemsPerPage, setItemsPerPage] = useState(5)
  // State hook for the total number of items (pagination use)
  const [totalItems, setTotalItems] = useState(0)

  // Effect hook for fetching data on component mount and when dependencies change
  useEffect(() => {
    fetchData() // Fetching the data
    // Cleanup function to unsubscribe from the items reference when the component unmounts or dependencies change
    return () => {
      off(itemsRef)
    }
  }, [itemsPerPage, currentPage]) // Dependencies to trigger effect

  // Asynchronous function for data fetching logic
  async function fetchData() {
    try {
      setLoading(true) // Set loading before operation begins
      await fetchTotalItems() // Fetch total number of items

      // Initialize an array to hold result snapshots
      const items = []
      // Calculate index to start fetching items based on current page and desired number of items per page
      const startIndex = (currentPage - 1) * itemsPerPage
      // Retrieve a snapshot of data
      const snapshot = await get(
        query(itemsRef, limitToLast(startIndex + itemsPerPage))
      )
      // console.log(snapshot)
      // Iterate over each child in the snapshot to create a list of item data
      snapshot.forEach((childSnapshot) => {
        items.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })
      console.log(items) // DATA FROM FIREBASE DATA BASE is here

      // After retrieving and pushing items, sort the data based on createdAt time, format dates and slice to the appropriate page size
      const serializedData = items
        .slice(0, itemsPerPage)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((item) => ({
          ...item,
          createdAt: item?.createdAt
            ? moment(item.createdAt).format('DD.MM.YYYY HH:mm:ss') // Formatting the createdAt date using moment.js
            : '',
          updatedAt: item?.updatedAt
            ? moment(item.updatedAt).format('DD.MM.YYYY HH:mm:ss') // Formatting the updatedAt date using moment.js
            : '',
        }))

      setItems(serializedData) // Update state to re-render with fetched items
    } catch (error) {
      console.log('fetchData error: ', error) // Log errors that occur during fetch
    } finally {
      setLoading(false) // Ensure to clear loading state when operation is complete
    }
  }

  // Asynchronous function for fetching the total number of items
  const fetchTotalItems = async () => {
    try {
      // Retrieve a snapshot of data from Firebase
      const snapshot = await get(itemsRef)
      // Extract the total count of items; default to 0 if unavailable
      const totalCount = snapshot?.size || 0
      setTotalItems(totalCount) // Update total items state
    } catch (error) {
      console.log('fetchTotalItems error: ', error) // Log any errors that occur during fetch
    }
  }

  // Asynchronous function for handling item deletion logic
  async function handleDelete(v) {
    try {
      // Confirm with the user before deleting the item
      const result = window.confirm('Are you sure want delete item?')
      if (result) {
        // If confirmed, remove the item from collection
        await removeItem(collections.items, v.id)
        fetchData() // Re-fetch data to update the UI after deletion
      }
    } catch (error) {
      console.log('handleDelete error: ', error) // Log errors that occur during delete operation
    }
  }

  // Function to handle changing pagination page
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber + 1) // Update current page state
  }

  // Function to handle changing number of items per page
  const handlePerPageChange = (perPage) => {
    setItemsPerPage(perPage) // Update items per page state
  }

  // Presentational component for creating item form
  function CreateItemForm() {
    const [itemForm, setItemForm] = useState(itemModel())

    const handleCreateItem = () => {
      createItem(collections.items, itemForm)
      setItemForm(itemModel())
      fetchData()
    }

    const handleChange = (e) => {
      const { name, value } = e.target
      setItemForm({ ...itemForm, [name]: value })
    }

    return (
      <Fragment>
        <input
          type="text"
          className="form-control"
          placeholder="Item Name"
          value={itemForm.name}
          name="name"
          onChange={handleChange}
        />
        <br />
        <input
          type="text"
          className="form-control"
          placeholder="Item Description"
          value={itemForm.description}
          name="description"
          onChange={handleChange}
        />
        <button
          className="btn btn-success mt-2"
          onClick={handleCreateItem}
          data-bs-dismiss="modal"
        >
          Create
        </button>
      </Fragment>
    )
  }

  // Presentational component for modal popup used to create a new item
  function CreateItemModal() {
    return (
      <div
        className="modal fade"
        id="exampleModal"
        tabIndex="-1"
        aria-labelledby="exampleModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">
                Create item
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <CreateItemForm />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form component to manage editing existing items
  function EditItemForm({ selectedItem }) {
    const [itemForm, setItemForm] = useState(selectedItem)

    const handleChange = (e) => {
      const { name, value } = e.target
      setItemForm({ ...itemForm, [name]: value })
    }

    const handleEditItem = async () => {
      try {
        const { id, createdAt, ...rest } = itemForm
        await updateItem(collections.items, id, {
          ...rest,
          updatedAt: Date.now(),
        })
        setItemForm(itemModel())
        fetchData()
      } catch (error) {
        console.log('handleEditItem error: ', error)
      }
    }

    return (
      <div>
        <input
          type="text"
          className="form-control"
          placeholder="Item Name"
          name="name"
          value={itemForm?.name || ''}
          onChange={handleChange}
        />
        <br />
        <input
          type="text"
          className="form-control"
          placeholder="Item Description"
          name="description"
          value={itemForm?.description || ''}
          onChange={handleChange}
        />
        <button
          data-bs-dismiss="modal"
          className="btn btn-primary mt-2"
          onClick={handleEditItem}
        >
          Save Changes
        </button>
      </div>
    )
  }

  // Modal component to encapsulate the edit item form
  function EditItemModal() {
    return (
      <div
        className="modal fade"
        id="editModal"
        tabIndex="-1"
        aria-labelledby="editModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editModalLabel">
                Update item
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <EditItemForm selectedItem={selectedItem} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Component for displaying a table of items including the pagination controls
  function DataTable() {
    return (
      <>
        <table className="table table-bordered">
          <thead>
            <tr>
              {columns.map((item) => (
                <th key={item}>{item}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>
                {columns.map((k) => (
                  <td key={k} style={k === 'id' ? { width: 230 } : {}}>
                    {v[k]}
                  </td>
                ))}
                <td style={{ width: 150 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    data-bs-toggle="modal"
                    data-bs-target="#editModal"
                    onClick={() => setSelectedItem(v)}
                  >
                    Edit
                  </button>{' '}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(v)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
        />
      </>
    )
  }

  // Determine columns for data table based on keys of the first item in the list
  const firstItem = items[0]
  const columns = firstItem ? Object.keys(firstItem) : []

  // Render the main component structure
  return (
    <Fragment>
      <div>
        {items.length ? (
          DataTable()
        ) : (
          <div className="text-center">No data found</div>
        )}
      </div>

      {/* {CreateItemModal()} */}
      {/* {EditItemModal()} */}
    </Fragment>
  )
}

export default RealtimeAPI
