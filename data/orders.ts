import { Order } from '@/types/order';

export const mockOrders: Order[] = [
  {
    id: 'OMX-1049', userId: 'USR-001', userName: 'Akash Kumar', userPhone: '9876543210', userEmail: 'akash.kumar@gmail.com', userAddress: '12, Gandhi Nagar, Hosur',
    shopkeeperId: 'SHOP-001', shopkeeperName: 'Sri Digital Xerox', shopkeeperOwner: 'Raj Kumar', shopkeeperPhone: '9876543001', shopkeeperLocation: 'Hosur, Tamil Nadu',
    documents: [
      { id: 'DOC-001', fileName: 'cafefeedbackform.docx', fileType: 'docx', fileSizeBytes: 102400, pages: 3, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 36 },
      { id: 'DOC-002', fileName: 'project_report.pdf', fileType: 'pdf', fileSizeBytes: 2048000, pages: 42, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'Spiral', extras: ['Laminated Cover'] }, subtotal: 164 }
    ],
    status: 'printing', paymentStatus: 'partially_paid',
    deliveryInfo: { type: 'delivery', address: '12, Gandhi Nagar, Hosur - 635109', estimatedTime: '2 hours' },
    printingSubtotal: 200, deliveryFee: 40, additionalCharges: 0, discount: 0, totalAmount: 240, amountPaid: 50, balanceDue: 190,
    timestamps: { new: '2026-09-11T15:06:00Z', accepted: '2026-09-11T15:22:00Z', printing: '2026-09-11T15:45:00Z' },
    createdAt: '2026-09-11T15:06:00Z', updatedAt: '2026-09-11T15:45:00Z'
  },
  {
    id: 'OMX-1048', userId: 'USR-003', userName: 'Ravi Patel', userPhone: '9754321098', userEmail: 'ravi.patel@gmail.com', userAddress: '45, Anna Salai, Chennai',
    shopkeeperId: 'SHOP-005', shopkeeperName: 'Tech Print Solutions', shopkeeperOwner: 'Pradeep Nair', shopkeeperPhone: '9532100005', shopkeeperLocation: 'Bengaluru, Karnataka',
    documents: [
      { id: 'DOC-003', fileName: 'resume_final.pdf', fileType: 'pdf', fileSizeBytes: 512000, pages: 2, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Portrait', copies: 5, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 120 }
    ],
    status: 'accepted', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Tech Print Solutions', shopAddress: '56, MG Road, Bengaluru - 560001', shopTiming: '09:00 AM - 10:00 PM' },
    printingSubtotal: 120, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 120, amountPaid: 120, balanceDue: 0,
    timestamps: { new: '2026-09-11T14:21:00Z', accepted: '2026-09-11T14:35:00Z' },
    createdAt: '2026-09-11T14:21:00Z', updatedAt: '2026-09-11T14:35:00Z'
  },
  {
    id: 'OMX-1047', userId: 'USR-008', userName: 'Kavitha Iyer', userPhone: '9209876543', userEmail: 'kavitha.iyer@gmail.com', userAddress: '7, MG Road, Salem',
    shopkeeperId: 'SHOP-006', shopkeeperName: 'RR Xerox & Prints', shopkeeperOwner: 'Raman Rajendran', shopkeeperPhone: '9421000006', shopkeeperLocation: 'Salem, Tamil Nadu',
    documents: [
      { id: 'DOC-004', fileName: 'assignment.docx', fileType: 'docx', fileSizeBytes: 204800, pages: 12, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 72 }
    ],
    status: 'ready_for_pickup', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'RR Xerox & Prints', shopAddress: '11, Omalur Road, Salem - 636004', shopTiming: '08:00 AM - 08:00 PM' },
    printingSubtotal: 72, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 72, amountPaid: 72, balanceDue: 0,
    timestamps: { new: '2026-09-11T13:00:00Z', accepted: '2026-09-11T13:15:00Z', printing: '2026-09-11T13:30:00Z', finishing: '2026-09-11T14:00:00Z', ready_for_pickup: '2026-09-11T14:10:00Z' },
    createdAt: '2026-09-11T13:00:00Z', updatedAt: '2026-09-11T14:10:00Z'
  },
  {
    id: 'OMX-1046', userId: 'USR-015', userName: 'Vijay Anand', userPhone: '8532109876', userEmail: 'vijay.anand@gmail.com', userAddress: '34, T Nagar, Chennai',
    shopkeeperId: 'SHOP-005', shopkeeperName: 'Tech Print Solutions', shopkeeperOwner: 'Pradeep Nair', shopkeeperPhone: '9532100005', shopkeeperLocation: 'Bengaluru, Karnataka',
    documents: [
      { id: 'DOC-005', fileName: 'thesis_draft.pdf', fileType: 'pdf', fileSizeBytes: 8192000, pages: 98, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 2, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'Hard Binding', extras: ['Laminated Cover'] }, subtotal: 588 }
    ],
    status: 'out_for_delivery', paymentStatus: 'paid',
    deliveryInfo: { type: 'delivery', address: '34, T Nagar, Chennai - 600017', estimatedTime: '1 hour' },
    printingSubtotal: 540, deliveryFee: 60, additionalCharges: 0, discount: 12, totalAmount: 588, amountPaid: 588, balanceDue: 0,
    timestamps: { new: '2026-09-11T10:00:00Z', accepted: '2026-09-11T10:18:00Z', printing: '2026-09-11T10:45:00Z', finishing: '2026-09-11T12:00:00Z', ready_for_pickup: '2026-09-11T12:30:00Z', out_for_delivery: '2026-09-11T13:00:00Z' },
    createdAt: '2026-09-11T10:00:00Z', updatedAt: '2026-09-11T13:00:00Z'
  },
  {
    id: 'OMX-1045', userId: 'USR-021', userName: 'Senthil Kumar', userPhone: '7976543210', userEmail: 'senthil.kumar@gmail.com', userAddress: '56, Main Road, Tiruppur',
    shopkeeperId: 'SHOP-010', shopkeeperName: 'Vijay Xerox & Binding', shopkeeperOwner: 'Vijay Shankar', shopkeeperPhone: '9087000010', shopkeeperLocation: 'Tiruppur, Tamil Nadu',
    documents: [
      { id: 'DOC-006', fileName: 'invoices_batch.pdf', fileType: 'pdf', fileSizeBytes: 1024000, pages: 24, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 3, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'Stapled', extras: [] }, subtotal: 216 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'delivery', address: '56, Main Road, Tiruppur - 641601', estimatedTime: 'Delivered' },
    printingSubtotal: 180, deliveryFee: 40, additionalCharges: 0, discount: 4, totalAmount: 216, amountPaid: 216, balanceDue: 0,
    timestamps: { new: '2026-09-11T08:30:00Z', accepted: '2026-09-11T08:45:00Z', printing: '2026-09-11T09:10:00Z', finishing: '2026-09-11T09:45:00Z', ready_for_pickup: '2026-09-11T10:00:00Z', out_for_delivery: '2026-09-11T10:30:00Z', delivered: '2026-09-11T11:15:00Z' },
    createdAt: '2026-09-11T08:30:00Z', updatedAt: '2026-09-11T11:15:00Z'
  },
  {
    id: 'OMX-1044', userId: 'USR-002', userName: 'Priya Sharma', userPhone: '9865432109', userEmail: 'priya.sharma@gmail.com', userAddress: '89, Koramangala, Bengaluru',
    shopkeeperId: 'SHOP-015', shopkeeperName: 'DigitalDrive Prints', shopkeeperOwner: 'Kavitha Nair', shopkeeperPhone: '8532000015', shopkeeperLocation: 'Bengaluru, Karnataka',
    documents: [
      { id: 'DOC-007', fileName: 'presentation.pptx', fileType: 'pptx', fileSizeBytes: 4096000, pages: 20, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Landscape', copies: 2, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 280 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'DigitalDrive Prints', shopAddress: '101, Whitefield Main Road, Bengaluru - 560066', shopTiming: '08:00 AM - 10:00 PM' },
    printingSubtotal: 280, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 280, amountPaid: 280, balanceDue: 0,
    timestamps: { new: '2026-09-11T07:00:00Z', accepted: '2026-09-11T07:12:00Z', printing: '2026-09-11T07:35:00Z', finishing: '2026-09-11T08:10:00Z', ready_for_pickup: '2026-09-11T08:20:00Z', delivered: '2026-09-11T08:45:00Z' },
    createdAt: '2026-09-11T07:00:00Z', updatedAt: '2026-09-11T08:45:00Z'
  },
  {
    id: 'OMX-1043', userId: 'USR-013', userName: 'Karthik Raja', userPhone: '8754321098', userEmail: 'karthik.raja@gmail.com', userAddress: '23, Hosur Main Road, Hosur',
    shopkeeperId: 'SHOP-001', shopkeeperName: 'Sri Digital Xerox', shopkeeperOwner: 'Raj Kumar', shopkeeperPhone: '9876543001', shopkeeperLocation: 'Hosur, Tamil Nadu',
    documents: [
      { id: 'DOC-008', fileName: 'marksheet.pdf', fileType: 'pdf', fileSizeBytes: 102400, pages: 1, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Portrait', copies: 3, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 60 }
    ],
    status: 'cancelled', paymentStatus: 'refunded',
    deliveryInfo: { type: 'pickup', shopName: 'Sri Digital Xerox', shopAddress: '12, Gandhi Nagar, Hosur - 635109', shopTiming: '08:00 AM - 09:00 PM' },
    printingSubtotal: 60, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 60, amountPaid: 60, balanceDue: 0,
    timestamps: { new: '2026-09-10T18:00:00Z', cancelled: '2026-09-10T18:25:00Z' },
    createdAt: '2026-09-10T18:00:00Z', updatedAt: '2026-09-10T18:25:00Z'
  },
  {
    id: 'OMX-1042', userId: 'USR-028', userName: 'Geetha Selvam', userPhone: '7209876543', userEmail: 'geetha.selvam@gmail.com', userAddress: '12, Swarnapuri, Salem',
    shopkeeperId: 'SHOP-006', shopkeeperName: 'RR Xerox & Prints', shopkeeperOwner: 'Raman Rajendran', shopkeeperPhone: '9421000006', shopkeeperLocation: 'Salem, Tamil Nadu',
    documents: [
      { id: 'DOC-009', fileName: 'study_material.pdf', fileType: 'pdf', fileSizeBytes: 5120000, pages: 68, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '2 Pages / Sheet', binding: 'Stapled', extras: [] }, subtotal: 204 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'delivery', address: '12, Swarnapuri, Salem - 636004', estimatedTime: 'Delivered' },
    printingSubtotal: 170, deliveryFee: 40, additionalCharges: 0, discount: 6, totalAmount: 204, amountPaid: 204, balanceDue: 0,
    timestamps: { new: '2026-09-10T14:00:00Z', accepted: '2026-09-10T14:15:00Z', printing: '2026-09-10T14:40:00Z', finishing: '2026-09-10T15:30:00Z', ready_for_pickup: '2026-09-10T15:45:00Z', out_for_delivery: '2026-09-10T16:15:00Z', delivered: '2026-09-10T17:00:00Z' },
    createdAt: '2026-09-10T14:00:00Z', updatedAt: '2026-09-10T17:00:00Z'
  },
  {
    id: 'OMX-1041', userId: 'USR-030', userName: 'Sudha Raman', userPhone: '7087654321', userEmail: 'sudha.raman@gmail.com', userAddress: '56, Adyar, Chennai',
    shopkeeperId: 'SHOP-005', shopkeeperName: 'Tech Print Solutions', shopkeeperOwner: 'Pradeep Nair', shopkeeperPhone: '9532100005', shopkeeperLocation: 'Bengaluru, Karnataka',
    documents: [
      { id: 'DOC-010', fileName: 'legal_docs.pdf', fileType: 'pdf', fileSizeBytes: 768000, pages: 15, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 4, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 180 }
    ],
    status: 'new', paymentStatus: 'unpaid',
    deliveryInfo: { type: 'delivery', address: '56, Adyar, Chennai - 600020', estimatedTime: '3-4 hours' },
    printingSubtotal: 120, deliveryFee: 60, additionalCharges: 0, discount: 0, totalAmount: 180, amountPaid: 0, balanceDue: 180,
    timestamps: { new: '2026-09-12T17:45:00Z' },
    createdAt: '2026-09-12T17:45:00Z', updatedAt: '2026-09-12T17:45:00Z'
  },
  {
    id: 'OMX-1040', userId: 'USR-011', userName: 'Arjun Menon', userPhone: '8976543210', userEmail: 'arjun.menon@gmail.com', userAddress: '34, Erode Main Road',
    shopkeeperId: 'SHOP-008', shopkeeperName: 'Lakshmi Printing Works', shopkeeperOwner: 'Ramya Lakshmi', shopkeeperPhone: '9209000008', shopkeeperLocation: 'Erode, Tamil Nadu',
    documents: [
      { id: 'DOC-011', fileName: 'certificates.pdf', fileType: 'pdf', fileSizeBytes: 409600, pages: 5, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Landscape', copies: 2, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: ['Glossy Paper'] }, subtotal: 150 }
    ],
    status: 'finishing', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Lakshmi Printing Works', shopAddress: '88, Perundurai Road, Erode - 638011', shopTiming: '09:00 AM - 07:30 PM' },
    printingSubtotal: 150, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 150, amountPaid: 150, balanceDue: 0,
    timestamps: { new: '2026-09-12T16:30:00Z', accepted: '2026-09-12T16:45:00Z', printing: '2026-09-12T17:00:00Z', finishing: '2026-09-12T17:30:00Z' },
    createdAt: '2026-09-12T16:30:00Z', updatedAt: '2026-09-12T17:30:00Z'
  },
  {
    id: 'OMX-1039', userId: 'USR-024', userName: 'Rekha Pillai', userPhone: '7643210987', userEmail: 'rekha.pillai@gmail.com', userAddress: '78, Erode Main Road',
    shopkeeperId: 'SHOP-008', shopkeeperName: 'Lakshmi Printing Works', shopkeeperOwner: 'Ramya Lakshmi', shopkeeperPhone: '9209000008', shopkeeperLocation: 'Erode, Tamil Nadu',
    documents: [
      { id: 'DOC-012', fileName: 'notes.docx', fileType: 'docx', fileSizeBytes: 307200, pages: 18, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 54 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Lakshmi Printing Works', shopAddress: '88, Perundurai Road, Erode - 638011', shopTiming: '09:00 AM - 07:30 PM' },
    printingSubtotal: 54, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 54, amountPaid: 54, balanceDue: 0,
    timestamps: { new: '2026-09-12T15:00:00Z', accepted: '2026-09-12T15:10:00Z', printing: '2026-09-12T15:25:00Z', finishing: '2026-09-12T15:50:00Z', ready_for_pickup: '2026-09-12T15:55:00Z', delivered: '2026-09-12T16:20:00Z' },
    createdAt: '2026-09-12T15:00:00Z', updatedAt: '2026-09-12T16:20:00Z'
  },
  {
    id: 'OMX-1038', userId: 'USR-018', userName: 'Nithya Srinivasan', userPhone: '8209876543', userEmail: 'nithya.s@gmail.com', userAddress: '12, Swarnapuri, Salem',
    shopkeeperId: 'SHOP-006', shopkeeperName: 'RR Xerox & Prints', shopkeeperOwner: 'Raman Rajendran', shopkeeperPhone: '9421000006', shopkeeperLocation: 'Salem, Tamil Nadu',
    documents: [
      { id: 'DOC-013', fileName: 'bank_statement.pdf', fileType: 'pdf', fileSizeBytes: 204800, pages: 8, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 2, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 96 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'RR Xerox & Prints', shopAddress: '11, Omalur Road, Salem - 636004', shopTiming: '08:00 AM - 08:00 PM' },
    printingSubtotal: 96, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 96, amountPaid: 96, balanceDue: 0,
    timestamps: { new: '2026-09-12T13:30:00Z', accepted: '2026-09-12T13:42:00Z', printing: '2026-09-12T14:00:00Z', finishing: '2026-09-12T14:20:00Z', ready_for_pickup: '2026-09-12T14:25:00Z', delivered: '2026-09-12T14:45:00Z' },
    createdAt: '2026-09-12T13:30:00Z', updatedAt: '2026-09-12T14:45:00Z'
  },
  {
    id: 'OMX-1037', userId: 'USR-004', userName: 'Sunita Reddy', userPhone: '9643210987', userEmail: 'sunita.reddy@outlook.com', userAddress: '23, Banjara Hills, Hyderabad',
    shopkeeperId: 'SHOP-004', shopkeeperName: 'Kumar Stationery & Xerox', shopkeeperOwner: 'Suresh Kumar', shopkeeperPhone: '9643210004', shopkeeperLocation: 'Vellore, Tamil Nadu',
    documents: [
      { id: 'DOC-014', fileName: 'application_form.pdf', fileType: 'pdf', fileSizeBytes: 153600, pages: 4, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 24 }
    ],
    status: 'new', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Kumar Stationery & Xerox', shopAddress: '23, CMC Road, Vellore - 632001', shopTiming: '09:00 AM - 09:30 PM' },
    printingSubtotal: 24, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 24, amountPaid: 24, balanceDue: 0,
    timestamps: { new: '2026-09-12T12:00:00Z' },
    createdAt: '2026-09-12T12:00:00Z', updatedAt: '2026-09-12T12:00:00Z'
  },
  {
    id: 'OMX-1036', userId: 'USR-029', userName: 'Harish Nagarajan', userPhone: '7198765432', userEmail: 'harish.n@gmail.com', userAddress: '67, RS Puram, Coimbatore',
    shopkeeperId: 'SHOP-007', shopkeeperName: 'College Zone Print Shop', shopkeeperOwner: 'Murugan Palani', shopkeeperPhone: '9310000007', shopkeeperLocation: 'Coimbatore, Tamil Nadu',
    documents: [
      { id: 'DOC-015', fileName: 'exam_papers.pdf', fileType: 'pdf', fileSizeBytes: 1536000, pages: 30, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'Stapled', extras: [] }, subtotal: 105 },
      { id: 'DOC-016', fileName: 'cover_page.docx', fileType: 'docx', fileSizeBytes: 51200, pages: 1, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 10 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'College Zone Print Shop', shopAddress: '3, GN Mills Road, Coimbatore - 641029', shopTiming: '08:00 AM - 09:00 PM' },
    printingSubtotal: 115, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 115, amountPaid: 115, balanceDue: 0,
    timestamps: { new: '2026-09-12T10:00:00Z', accepted: '2026-09-12T10:12:00Z', printing: '2026-09-12T10:35:00Z', finishing: '2026-09-12T11:10:00Z', ready_for_pickup: '2026-09-12T11:15:00Z', delivered: '2026-09-12T11:40:00Z' },
    createdAt: '2026-09-12T10:00:00Z', updatedAt: '2026-09-12T11:40:00Z'
  },
  {
    id: 'OMX-1035', userId: 'USR-031', userName: 'Vinoth Kumar', userPhone: '6976543210', userEmail: 'vinoth.kumar@gmail.com', userAddress: '34, Hosur Main Road, Hosur',
    shopkeeperId: 'SHOP-012', shopkeeperName: 'Printzone Hosur', shopkeeperOwner: 'Karthikeyan S', shopkeeperPhone: '8865000012', shopkeeperLocation: 'Hosur, Tamil Nadu',
    documents: [
      { id: 'DOC-017', fileName: 'brochure.pdf', fileType: 'pdf', fileSizeBytes: 3072000, pages: 6, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Both Sides', orientation: 'Portrait', copies: 50, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: ['Glossy Paper'] }, subtotal: 480 }
    ],
    status: 'printing', paymentStatus: 'partially_paid',
    deliveryInfo: { type: 'delivery', address: '34, Hosur Main Road, Hosur - 635109', estimatedTime: '2 hours' },
    printingSubtotal: 450, deliveryFee: 40, additionalCharges: 0, discount: 10, totalAmount: 480, amountPaid: 200, balanceDue: 280,
    timestamps: { new: '2026-09-12T09:00:00Z', accepted: '2026-09-12T09:15:00Z', printing: '2026-09-12T09:40:00Z' },
    createdAt: '2026-09-12T09:00:00Z', updatedAt: '2026-09-12T09:40:00Z'
  },
  {
    id: 'OMX-1034', userId: 'USR-032', userName: 'Bhavani Raghunathan', userPhone: '6865432109', userEmail: 'bhavani.r@gmail.com', userAddress: '12, Krishnagiri',
    shopkeeperId: 'SHOP-003', shopkeeperName: 'Arjun Copy Centre', shopkeeperOwner: 'Arjun Menon', shopkeeperPhone: '9754321003', shopkeeperLocation: 'Krishnagiri, Tamil Nadu',
    documents: [
      { id: 'DOC-018', fileName: 'report.docx', fileType: 'docx', fileSizeBytes: 256000, pages: 14, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 42 }
    ],
    status: 'accepted', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Arjun Copy Centre', shopAddress: '7, Bus Stand Road, Krishnagiri - 635001', shopTiming: '08:30 AM - 08:30 PM' },
    printingSubtotal: 42, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 42, amountPaid: 42, balanceDue: 0,
    timestamps: { new: '2026-09-12T08:00:00Z', accepted: '2026-09-12T08:14:00Z' },
    createdAt: '2026-09-12T08:00:00Z', updatedAt: '2026-09-12T08:14:00Z'
  },
  {
    id: 'OMX-1033', userId: 'USR-033', userName: 'Murugan Vel', userPhone: '6754321098', userEmail: 'murugan.vel@gmail.com', userAddress: '45, Tiruppur Main Road',
    shopkeeperId: 'SHOP-010', shopkeeperName: 'Vijay Xerox & Binding', shopkeeperOwner: 'Vijay Shankar', shopkeeperPhone: '9087000010', shopkeeperLocation: 'Tiruppur, Tamil Nadu',
    documents: [
      { id: 'DOC-019', fileName: 'project.pdf', fileType: 'pdf', fileSizeBytes: 1024000, pages: 20, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Both Sides', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'Spiral', extras: [] }, subtotal: 100 }
    ],
    status: 'new', paymentStatus: 'unpaid',
    deliveryInfo: { type: 'pickup', shopName: 'Vijay Xerox & Binding', shopAddress: '22, Kumaran Road, Tiruppur - 641601', shopTiming: '08:30 AM - 08:30 PM' },
    printingSubtotal: 80, deliveryFee: 0, additionalCharges: 20, discount: 0, totalAmount: 100, amountPaid: 0, balanceDue: 100,
    timestamps: { new: '2026-09-12T17:50:00Z' },
    createdAt: '2026-09-12T17:50:00Z', updatedAt: '2026-09-12T17:50:00Z'
  },
  {
    id: 'OMX-1032', userId: 'USR-034', userName: 'Lavanya Gopal', userPhone: '6643210987', userEmail: 'lavanya.gopal@gmail.com', userAddress: '67, Erode',
    shopkeeperId: 'SHOP-008', shopkeeperName: 'Lakshmi Printing Works', shopkeeperOwner: 'Ramya Lakshmi', shopkeeperPhone: '9209000008', shopkeeperLocation: 'Erode, Tamil Nadu',
    documents: [
      { id: 'DOC-020', fileName: 'medical_records.pdf', fileType: 'pdf', fileSizeBytes: 204800, pages: 8, printSpecification: { paper: 'A4', printType: 'Black & White', sides: 'Front Only', orientation: 'Portrait', copies: 1, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 48 }
    ],
    status: 'out_for_delivery', paymentStatus: 'paid',
    deliveryInfo: { type: 'delivery', address: '67, Erode Main Road - 638011', estimatedTime: '30 mins' },
    printingSubtotal: 24, deliveryFee: 30, additionalCharges: 0, discount: 6, totalAmount: 48, amountPaid: 48, balanceDue: 0,
    timestamps: { new: '2026-09-12T16:00:00Z', accepted: '2026-09-12T16:10:00Z', printing: '2026-09-12T16:25:00Z', finishing: '2026-09-12T16:45:00Z', ready_for_pickup: '2026-09-12T16:50:00Z', out_for_delivery: '2026-09-12T17:10:00Z' },
    createdAt: '2026-09-12T16:00:00Z', updatedAt: '2026-09-12T17:10:00Z'
  },
  {
    id: 'OMX-1031', userId: 'USR-035', userName: 'Dhinesh Prabu', userPhone: '6532109876', userEmail: 'dhinesh.prabu@gmail.com', userAddress: '89, Hosur Industrial Area',
    shopkeeperId: 'SHOP-001', shopkeeperName: 'Sri Digital Xerox', shopkeeperOwner: 'Raj Kumar', shopkeeperPhone: '9876543001', shopkeeperLocation: 'Hosur, Tamil Nadu',
    documents: [
      { id: 'DOC-021', fileName: 'aadhar_passport.pdf', fileType: 'pdf', fileSizeBytes: 102400, pages: 2, printSpecification: { paper: 'A4', printType: 'Color', sides: 'Front Only', orientation: 'Portrait', copies: 2, pages: 'All Pages', pageLayout: '1 Page / Sheet', binding: 'None', extras: [] }, subtotal: 40 }
    ],
    status: 'delivered', paymentStatus: 'paid',
    deliveryInfo: { type: 'pickup', shopName: 'Sri Digital Xerox', shopAddress: '12, Gandhi Nagar, Hosur - 635109', shopTiming: '08:00 AM - 09:00 PM' },
    printingSubtotal: 40, deliveryFee: 0, additionalCharges: 0, discount: 0, totalAmount: 40, amountPaid: 40, balanceDue: 0,
    timestamps: { new: '2026-09-12T14:30:00Z', accepted: '2026-09-12T14:40:00Z', printing: '2026-09-12T14:55:00Z', finishing: '2026-09-12T15:10:00Z', ready_for_pickup: '2026-09-12T15:15:00Z', delivered: '2026-09-12T15:30:00Z' },
    createdAt: '2026-09-12T14:30:00Z', updatedAt: '2026-09-12T15:30:00Z'
  },
];
