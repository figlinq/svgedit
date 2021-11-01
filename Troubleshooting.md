## FormElementMixin errors
In case of FormElementMixin errors in Firefox, edit node_modules\elix\src\base\FormElementMixin.js, and change line 125 to:
```code
if (this[nativeInternals] && this[nativeInternals].hasOwnProperty("setFormValue")) {
```

